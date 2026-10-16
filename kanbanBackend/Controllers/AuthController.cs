using System.Security.Claims;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace kanbanBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    
    private readonly IAuthInterface _authService;
    private readonly IGoogleTicketInterface _googleTicketService;

    public AuthController(IAuthInterface authService, IGoogleTicketInterface googleLoginTicketService)
    {
        _authService = authService;
        _googleTicketService = googleLoginTicketService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse?>> Register(RegisterRequest registerRequest)
    {
        try
        {
            var response = await _authService.RegisterUser(registerRequest);
            return Ok(response);
        }
        catch (InvalidOperationException e)
        {
            return Conflict(new
            {
                message = e.Message
            });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<CredentialResponse?>> Login(LoginRequest loginRequest)
    {
        var response = await _authService.Login(loginRequest);
        if (response is null)
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }
        
        return Ok(response);
    }
    [AllowAnonymous]
    [HttpGet("google")]
    public IActionResult GoogleLogin([FromQuery] string? platform)
    {
        var isWeb = platform == "web";

        return Challenge(
            new AuthenticationProperties
            {
                RedirectUri = isWeb
                    ? "/api/auth/google/complete?platform=web"
                    : "/api/auth/google/complete"
            },
            "Google"
        );
    }

    [AllowAnonymous]
    [HttpPost("google/exchange")]
    [HttpPost("github/exchange")]
    [HttpPost("microsoft/exchange")]
    public async Task<ActionResult<AuthResponse>> ExchangeExternalLogin(ExternalLoginExchangeRequest request)
    {
        try
        {
            var userId = _googleTicketService.ValidateTicket(request.Ticket);
            var response = await _authService.AuthenticatedUserResponse(userId);
            if (!response.IsSuccess)
            {
                return BadRequest(new
                {
                    message = response.ErrorMessage
                });
            }
            return Ok(response.Value!);
        }
        catch (InvalidOperationException e)
        {
            return Unauthorized(new { message = e.Message });
        }
    }
    
    
    [AllowAnonymous]
    [HttpGet("microsoft/complete")]
    public async Task<IActionResult> MicrosoftComplete(
        [FromQuery] string? platform)
    {
        var result = await HttpContext.AuthenticateAsync("MicrosoftExternal");

        if (!result.Succeeded || result.Principal is null)
        {
            return Unauthorized(new { message = "Microsoft sign-in failed." });
        }

        var claims = result.Principal.Claims;

        var microsoftUserId =
            claims.FirstOrDefault(c => c.Type == "http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value
            ?? claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? claims.FirstOrDefault(c => c.Type == "sub")?.Value;

        var email = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value
                    ?? claims.FirstOrDefault(c => c.Type == "email")?.Value;

        var firstName = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.GivenName)?.Value;

        var lastName = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Surname)?.Value;

        var profilePicture = claims.FirstOrDefault(c => c.Type == "picture")?.Value;

        if (string.IsNullOrWhiteSpace(microsoftUserId))
        {
            return BadRequest(new { message = "Microsoft did not provide an account identifier." });
        }

        var registration = await _authService.RegisterMicrosoftUserAsync(
            microsoftUserId,
            email,
            firstName,
            lastName,
            profilePicture);

        if (!registration.IsSuccess)
        {
            return BadRequest(new { message = registration.ErrorMessage });
        }
        
        if (registration.Value!.RequiresEmailConfirmation)
        {
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTENDURL");

            return Redirect(
                $"{frontendUrl!.TrimEnd('/')}/microsoft-link-pending");
        }

        var authResponse = registration.Value.AuthResponse!;

        var ticket = _googleTicketService.CreateTicket(authResponse.UserId);

        var isWeb = platform == "web";
        var frontendRedirect = isWeb
            ? $"{Environment.GetEnvironmentVariable("FRONTENDURL")!.TrimEnd('/')}/(auth)/microsoft"
            : Environment.GetEnvironmentVariable("MICROSOFTFRONTENDREDIRECT");

        if (string.IsNullOrWhiteSpace(frontendRedirect))
        {
            throw new InvalidOperationException(
                "The Microsoft frontend redirect URL is not configured.");
        }

        return Redirect(
            $"{frontendRedirect}?ticket={Uri.EscapeDataString(ticket)}");
    }
    
    [AllowAnonymous]
    [HttpGet("microsoft")]
    public IActionResult MicrosoftLogin([FromQuery] string? platform)
    {
        var redirectUri = Url.Action(
            nameof(MicrosoftComplete),
            "Auth",
            new { platform = platform == "web" ? "web" : (string?)null });

        var properties = new AuthenticationProperties
        {
            RedirectUri = redirectUri
        };

        return Challenge(properties, "Microsoft");
    }
    
    [AllowAnonymous]
    [HttpPost("microsoft/confirm-link")]
    public async Task<ActionResult<AuthResponse>> ConfirmMicrosoftLink(
        [FromBody] ConfirmMicrosoftLinkRequest request)
    {
        var result = await _authService.ConfirmMicrosoftLinkAsync(request.Token);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        return Ok(result.Value);
    }
    
    
    [AllowAnonymous]
    [HttpGet("google/complete")]
    public async Task<IActionResult> GoogleComplete()
    {
        var result = await HttpContext.AuthenticateAsync("GoogleExternal");

        if (!result.Succeeded || result.Principal == null)
        {
            return BadRequest(new
            {
                message = "Google authentication failed."
            });
        }
        var principal = result.Principal;
        var googleId =
            principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? principal.FindFirst("sub")?.Value;

        var email =
            principal.FindFirst(ClaimTypes.Email)?.Value
            ?? principal.FindFirst("email")?.Value;

        var firstName =
            principal.FindFirst(ClaimTypes.GivenName)?.Value
            ?? principal.FindFirst("given_name")?.Value;

        var lastName =
            principal.FindFirst(ClaimTypes.Surname)?.Value
            ?? principal.FindFirst("family_name")?.Value;

        var profilePicture = principal.FindFirst("picture")?.Value;

        if (string.IsNullOrWhiteSpace(googleId) ||
            string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new
            {
                message = "Google did not provide the required account information."
            });
        }

        try
        {
            var response = await _authService.RegisterExternalUser(
                googleId,
                email,
                firstName,
                lastName,
                profilePicture,
                ExternalLoginProvider.Google);
            if (!response.IsSuccess)
            {
                return BadRequest(new
                {
                    message = response.ErrorMessage!
                });
            }

            var user = response.Value!;
            var ticket = _googleTicketService.CreateTicket(user.UserId);
            var isWeb = Request.Query["platform"] == "web";
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTENDURL");
            var webRedirect = $"{frontendUrl}/(auth)/google";
            var frontendRedirect = isWeb
                ? webRedirect
                : Environment.GetEnvironmentVariable("GOOGLEFRONTENDREDIRECT");

            if (string.IsNullOrWhiteSpace(frontendRedirect))
            {
                throw new InvalidOperationException(
                    "Google frontend redirect is missing."
                );
            }

            var redirectUrl =
                $"{frontendRedirect}?ticket={Uri.EscapeDataString(ticket)}";

            return Redirect(redirectUrl);
        }
        catch (InvalidOperationException e)
        {
            return Conflict(new
            {
                message = e.Message
            });
        }
    }
    
    [AllowAnonymous]
    [HttpGet("github")]
    public IActionResult GitHubLogin([FromQuery] string? platform)
    {
        var redirectUri = "/api/Auth/github/complete";

        if (platform == "web")
        {
            redirectUri += "?platform=web";
        }

        return Challenge(
            new AuthenticationProperties
            {
                RedirectUri = redirectUri
            },
            "GitHub");
    }


    
    [AllowAnonymous]
    [HttpGet("github/complete")]
    public async Task<IActionResult> GitHubComplete(
        [FromQuery] string? platform)
    {
        var result = await HttpContext.AuthenticateAsync("GitHubExternal");

        if (!result.Succeeded || result.Principal is null)
        {
            return Unauthorized("GitHub authentication failed.");
        }

        var principal = result.Principal;

        var githubUserId = principal
            .FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
            ?.Value;

        var accessToken = result.Properties?.GetTokenValue("access_token");

        if (string.IsNullOrWhiteSpace(githubUserId) ||
            string.IsNullOrWhiteSpace(accessToken))
        {
            return Unauthorized("GitHub identity or access token is missing.");
        }

        var emailResponse = await _authService.ParseVerifiedGitHubEmail(accessToken);
        if (!emailResponse.IsSuccess)
        {
            return BadRequest(
                $"We could not connect to GitHub with these credentials, error code {emailResponse.ErrorMessage}");
        }

        var email = emailResponse.Value!;
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(
                "Your GitHub account must have a primary, verified email address.");
        }

        var displayName = principal
            .FindFirst(System.Security.Claims.ClaimTypes.Name)
            ?.Value;

        var nameParts = displayName?
            .Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);

        var firstName = nameParts?.FirstOrDefault();
        var lastName = nameParts?.Skip(1).FirstOrDefault();

        var profilePicture = principal.FindFirst("picture")?.Value;

        var userResult = await _authService.RegisterExternalUser(
            githubUserId,
            email,
            firstName,
            lastName,
            profilePicture,
            ExternalLoginProvider.GitHub);

        if (!userResult.IsSuccess)
        {
            throw new InvalidOperationException(userResult.ErrorMessage);
        }

        var user = userResult.Value!;
        var ticket = _googleTicketService.CreateTicket(user.UserId);

        var encodedTicket = Uri.EscapeDataString(ticket);

        if (platform == "web")
        {
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTENDURL")
                ?? throw new InvalidOperationException("Frontend URL is missing.");

            return Redirect(
                $"{frontendUrl}/(auth)/github?ticket={encodedTicket}");
        }

        var frontendRedirect = Environment.GetEnvironmentVariable(
            "GITHUBFRONTENDREDIRECT")
            ?? throw new InvalidOperationException(
                "GitHub frontend redirect URL is missing.");

        return Redirect($"{frontendRedirect}?ticket={encodedTicket}");
    }
}