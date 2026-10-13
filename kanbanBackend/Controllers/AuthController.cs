using kanbanBackend.DTOs.Auth;
using kanbanBackend.Services.Auth;
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
    public IActionResult GoogleLogin()
    {
        return Challenge(
            new AuthenticationProperties
            {
                RedirectUri = "/api/auth/google/complete"
            },
            "Google"
        );
    }

    [AllowAnonymous]
    [HttpPost("google/exchange")]
    public async Task<ActionResult<AuthResponse>> ExchangeGoogleLogin(ExternalLoginExchangeRequest request)
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

        var googleId = principal.FindFirst("sub")?.Value;
        var email = principal.FindFirst("email")?.Value;
        var firstName = principal.FindFirst("given_name")?.Value;
        var lastName = principal.FindFirst("family_name")?.Value;
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
            var response = await _authService.RegisterGoogleUser(
                googleId,
                email,
                firstName,
                lastName,
                profilePicture
            );
            if (!response.IsSuccess)
            {
                return BadRequest(new
                {
                    message = response.ErrorMessage!
                });
            }

            var user = response.Value!;
            var ticket = _googleTicketService.CreateTicket(user.UserId);
            var frontendRedirect =
                Environment.GetEnvironmentVariable("GOOGLEFRONTENDREDIRECT")
                ?? throw new InvalidOperationException("Google frontend redirect is missing.");
            var redirectUrl = $"{frontendRedirect}?ticket={Uri.EscapeDataString(ticket)}";
            

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
}