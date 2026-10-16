using System.Text.Json;
using kanbanBackend.Data;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services.Auth;

public class AuthService : IAuthInterface
{
    private readonly KanbanDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtInterface _jwtService;
    private readonly IEmailInterface _emailService;
    private readonly IEmailConfirmationInterface _emailConfirmationService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _protector;

    public AuthService(KanbanDbContext context, IPasswordHasher<User> passwordHasher, IJwtInterface jwtService,
        IEmailInterface emailService, IEmailConfirmationInterface emailConfirmationService, IHttpClientFactory  httpClientFactory,
        IDataProtectionProvider dataProtectionProvider)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
        _emailService = emailService;
        _emailConfirmationService = emailConfirmationService;
        _httpClientFactory = httpClientFactory;
        _protector = dataProtectionProvider.CreateProtector("Kanban.MicrosoftLinkConfirmation.v1");
    }

    public async Task<RegistrationResponse> RegisterUser(RegisterRequest request)
    {
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == request.Email);
        
        var usernameExists = await _context.Users
            .AnyAsync(u => u.Username == request.Username);

        if (usernameExists)
        {
            throw new InvalidOperationException(
                "Username is already in use.");
        }

        if (emailExists)
        {
            throw new InvalidOperationException(
                "Email is already in use.");
        }

        var user = new User
        {
            Username = request.Username,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            IsEmailVerified = false,
        };
        
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        
        var token = await _emailConfirmationService.GenerateEmailConfirmationTokenAsync(user);
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTENDURL")
            ?? throw new InvalidOperationException("Frontend URL is missing");
        
        var confirmationUrl = $"{frontendUrl}/email-confirmed" +
                              $"?userId={user.Id}" +
                              $"&token={Uri.EscapeDataString(token)}";
        
        await _emailService.SendEmailConfirmationAsync(user.Email, confirmationUrl, firstName: user.FirstName);

        return new RegistrationResponse
        {
            UserId = user.Id,
            Email = user.Email,
            Message =
                $"Thank you for signing up {user.FirstName}! We have sent you a link to confirm your email address."
        };
    }

    public async Task<ModelResult<string>> ParseVerifiedGitHubEmail(string accessToken)
    {
        var client = _httpClientFactory.CreateClient();
        
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
        request.Headers
            .Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.Accept.ParseAdd("application/vnd.github+json");
        request.Headers.UserAgent.ParseAdd("Kanban");

        using var response = await client.SendAsync(request);
        var failCode = ModelResult<string>.Failure(response.StatusCode.ToString());
        if (!response.IsSuccessStatusCode)
        {
            return failCode;
        }
        
        using var document = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        foreach (var emailEntry in document.RootElement.EnumerateArray())
        {
            var isPrimary = emailEntry.TryGetProperty(
                "primary", out var primary) && primary.GetBoolean();

            var isVerified = emailEntry.TryGetProperty(
                "verified", out var verified) && verified.GetBoolean();

            if (isPrimary && isVerified &&
                emailEntry.TryGetProperty("email", out var email))
            {
                return ModelResult<string>.Success(email.GetString()!);
            }
        }

        return failCode;
    }

    public async Task<CredentialResponse?> Login(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == request.Identifier ||
                                      u.Email.ToLower() == request.Identifier.ToLower());
        
        if(user is null){
            return null;
        }
        
        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return null;
        }
        
        if (!user.IsEmailVerified)
        {
            return null;
        }

        return new AuthResponse
        {
            Token = _jwtService.GenerateToken(user),
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Email = user.Email
        };
    }

    public async Task<ModelResult<AuthResponse>> AuthenticatedUserResponse(int userId)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
        {
            return ModelResult<AuthResponse>.Failure("User not found");
        }
        var response =  new AuthResponse
        {
            Token = _jwtService.GenerateToken(user),
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Email = user.Email
        };
        return ModelResult<AuthResponse>.Success(response);
    }

    public async Task<ModelResult<AuthResponse>> ConfirmMicrosoftLinkAsync(string token)
    {
        var invalidRequest = ModelResult<AuthResponse>.Failure("The confirmation link is invalid or expired");
        if (string.IsNullOrWhiteSpace(token))
        {
            return invalidRequest;
        }

        MicrosoftLinkTokenPayload? payload;
        try
        {
            var unprotectedToken = _protector.Unprotect(token);
            payload = JsonSerializer.Deserialize<MicrosoftLinkTokenPayload>(unprotectedToken);
        }
        catch (Exception ex) when (ex is System.Security.Cryptography.CryptographicException or JsonException)
        {
            return string.IsNullOrEmpty(ex.Message) ? invalidRequest : ModelResult<AuthResponse>.Failure(ex.Message);
        }
        
        if(payload is null ||
            payload.UserId <= 0 || string.IsNullOrWhiteSpace(payload.ProviderUserId) ||
            string.IsNullOrWhiteSpace(payload.Email) || payload.ExpiresAtUnixSeconds <= DateTimeOffset.UtcNow.ToUnixTimeSeconds())
        {
            return invalidRequest;
        }
        
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == payload.UserId);
        if (user is null ||
            !string.Equals(
                user.Email.Trim(),
                payload.Email.Trim(),
                StringComparison.OrdinalIgnoreCase))
        {
            return ModelResult<AuthResponse>.Failure("The confirmation link is invalid or has expired.");
        }
        var existingLogin = await _context.ExternalLogins
            .FirstOrDefaultAsync(e =>
                e.Provider == ExternalLoginProvider.Microsoft  &&
                e.ProviderUserId == payload.ProviderUserId);

        if (existingLogin is not null)
        {
            if (existingLogin.UserId != user.Id)
            {
                return ModelResult<AuthResponse>.Failure("This Microsoft account is already linked to another Kanban account.");
            }
            return await AuthenticatedUserResponse(user.Id);
        }

        var externalLogin = new ExternalLogin
        {
            UserId = user.Id,
            Provider = ExternalLoginProvider.Microsoft,
            ProviderUserId = payload.ProviderUserId,
            User = user
        };

        _context.ExternalLogins.Add(externalLogin);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _context.Entry(externalLogin).State = EntityState.Detached;
            var concurrentLink = await _context.ExternalLogins
                .FirstOrDefaultAsync(e =>
                    e.Provider == ExternalLoginProvider.Microsoft &&
                    e.ProviderUserId == payload.ProviderUserId);

            if (concurrentLink?.UserId != user.Id)
            {
                return ModelResult<AuthResponse>.Failure(
                    "This Microsoft account could not be linked. Please sign in and try again.");
            }
        }

        return await AuthenticatedUserResponse(user.Id);
    }
    
    public async Task<ModelResult<MicrosoftLoginResult>> InitiateMicrosoftLinkConfirmationAsync(User existingUser,
        string microsoftProviderUserId)
{
    if (string.IsNullOrWhiteSpace(microsoftProviderUserId))
    {
        return ModelResult<MicrosoftLoginResult>.Failure(
            "The Microsoft account could not be identified.");
    }
    
    var existingMicrosoftLogin = await _context.ExternalLogins
        .FirstOrDefaultAsync(e =>
            e.Provider == ExternalLoginProvider.Microsoft &&
            e.ProviderUserId == microsoftProviderUserId);

    if (existingMicrosoftLogin is not null)
    {
        if (existingMicrosoftLogin.UserId != existingUser.Id)
        {
            return ModelResult<MicrosoftLoginResult>.Failure(
                "This Microsoft account is already linked to another Kanban account.");
        }

        var response = await AuthenticatedUserResponse(existingUser.Id);

        if (!response.IsSuccess)
        {
            return ModelResult<MicrosoftLoginResult>.Failure(
                response.ErrorMessage!);
        }

        return ModelResult<MicrosoftLoginResult>.Success(
            new MicrosoftLoginResult
            {
                AuthResponse = response.Value
            });
    }

    var payload = new MicrosoftLinkTokenPayload
    {
        UserId = existingUser.Id,
        ProviderUserId = microsoftProviderUserId,
        Email = existingUser.Email,
        ExpiresAtUnixSeconds = DateTimeOffset.UtcNow
            .AddMinutes(30)
            .ToUnixTimeSeconds()
    };

    var serializedPayload = JsonSerializer.Serialize(payload);
    var protectedToken = _protector.Protect(serializedPayload);

    var frontendUrl = Environment.GetEnvironmentVariable("FRONTENDURL");

    if (string.IsNullOrWhiteSpace(frontendUrl))
    {
        throw new InvalidOperationException("FRONTENDURL is not configured.");
    }

    var confirmationUrl =
        $"{frontendUrl.TrimEnd('/')}/microsoft-link-confirmation" +
        $"?token={Uri.EscapeDataString(protectedToken)}";

    await _emailService.SendMicrosoftLinkConfirmationAsync(
        existingUser.Email,
        confirmationUrl,
        firstName: existingUser.FirstName);

    return ModelResult<MicrosoftLoginResult>.Success(
        new MicrosoftLoginResult
        {
            RequiresEmailConfirmation = true,
            Message =
                "We've sent a confirmation link to the email address on your Kanban account."
        });
}

    public async Task<ModelResult<MicrosoftLoginResult>> RegisterMicrosoftUserAsync(string microsoftUserId,
        string? firstName, string? lastName, string? email,
        string? profilePicture)
    {
        if (string.IsNullOrWhiteSpace(microsoftUserId))
        {
            return ModelResult<MicrosoftLoginResult>.Failure("Microsoft did not provide a valid account identifier");
        }

        var existingLogin  = await _context.ExternalLogins
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => 
                e.Provider == ExternalLoginProvider.Microsoft && 
                e.ProviderUserId == microsoftUserId);

        if (existingLogin is not null)
        {
            var response = await AuthenticatedUserResponse(existingLogin.Id);
            if (!response.IsSuccess)
            {
                var error =  response.ErrorMessage ?? "Failed to register Kanban user via microsoft, please use your email address instead";
                return ModelResult<MicrosoftLoginResult>.Failure(error);
            }

            var result = new MicrosoftLoginResult
            {
                RequiresEmailConfirmation = false,
                AuthResponse = response.Value
            };
            return ModelResult<MicrosoftLoginResult>.Success(result);
        }

        if (string.IsNullOrWhiteSpace(email) ||
            !System.Net.Mail.MailAddress.TryCreate(email.Trim(), out var address) ||
            !string.Equals(address.Address, email.Trim(),
                StringComparison.OrdinalIgnoreCase))
        {
            return ModelResult<MicrosoftLoginResult>.Failure("Your microsoft account doesnt seem to have an email" +
                                                             " address, please use another sign in method");
        }
        email = email.Trim();
        var existingUser = await _context.Users.FirstOrDefaultAsync(e => e.Email == email);
        if (existingUser is not null)
        {
            return await InitiateMicrosoftLinkConfirmationAsync(existingUser, microsoftUserId);
        }

        var usernameBase = email.Split('@')[0];
        var username = usernameBase;
        var usernameExists = true;
        while (usernameExists)
        {
            usernameExists = await _context.Users
                .AnyAsync(e => e.Username.ToLower() == username.ToLower());
            if (usernameExists)
            {
                username = $"{usernameBase}{Random.Shared.Next(1000, 9999)}";
            }
        }

        var newUser = new User
        {
            Username = username,
            Email = email,
            FirstName = string.IsNullOrWhiteSpace(firstName) ? "User" : firstName,
            LastName = lastName,
            ProfileImage = profilePicture,
            IsEmailVerified = false,
            PasswordHash = string.Empty,
            CreatedAt = DateTime.UtcNow,
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();
        
        var newLogin = new ExternalLogin
        {
            ProviderUserId = microsoftUserId,
            User = newUser,
            UserId = newUser.Id,
            Provider = ExternalLoginProvider.Microsoft,
        };
        _context.ExternalLogins.Add(newLogin);
        await _context.SaveChangesAsync();
        
        var confirmationToken = await _emailConfirmationService.GenerateEmailConfirmationTokenAsync(newUser);
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTENDURL")
                          ?? throw new InvalidOperationException("Frontend URL is missing");
        
        var confirmationUrl = $"{frontendUrl}/email-confirmed" +
                              $"?userId={newUser.Id}" +
                              $"&token={Uri.EscapeDataString(confirmationToken)}";
        await _emailService.SendEmailConfirmationAsync(newUser.Email, confirmationUrl, newUser.FirstName);
        var authResponse = await AuthenticatedUserResponse(newUser.Id);
        if (!authResponse.IsSuccess)
        {
            var error =  authResponse.ErrorMessage ?? "Failed to register Kanban user via microsoft," +
                " please use your email address instead";
            return ModelResult<MicrosoftLoginResult>.Failure(error);
        }

        var newMicrosoftRequest = new MicrosoftLoginResult
        {
            RequiresEmailConfirmation = true,
            AuthResponse = authResponse.Value!,
        };
        return ModelResult<MicrosoftLoginResult>.Success(newMicrosoftRequest);
    }
    
    public async Task<ModelResult<AuthResponse>> RegisterExternalUser(
        string externalUserId, string email, string? firstName, string? lastName,
        string? profilePicture, ExternalLoginProvider provider)
    {
        var existingUser = await _context.ExternalLogins
            .Include(e => e.User)
            .FirstOrDefaultAsync(e =>
                e.Provider == provider &&
                e.ProviderUserId == externalUserId);
        
        if (existingUser is not null)
        {
            var user = existingUser.User;
            var response =  new AuthResponse
            {
                Token = _jwtService.GenerateToken(user),
                UserId = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
            };
            return ModelResult<AuthResponse>.Success(response);
        }
        var unlinkedUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
        if (unlinkedUser is not null)
        {
            var linkExternalLogin = new ExternalLogin
            {
                UserId = unlinkedUser.Id,
                Provider = provider,
                ProviderUserId = externalUserId,
                User =  unlinkedUser
            };
            if (string.IsNullOrEmpty(unlinkedUser.ProfileImage) && !string.IsNullOrEmpty(profilePicture))
            {
                unlinkedUser.ProfileImage = profilePicture;
                await _context.SaveChangesAsync();
            }
            
            _context.ExternalLogins.Add(linkExternalLogin);
            await _context.SaveChangesAsync();
            var linkedUserResponse = new AuthResponse
            {
                Token = _jwtService.GenerateToken(unlinkedUser),
                UserId = unlinkedUser.Id,
                FirstName = unlinkedUser.FirstName,
                LastName = unlinkedUser.LastName,
                Email = unlinkedUser.Email,
            };
            return ModelResult<AuthResponse>.Success(linkedUserResponse);
        }
        
        var username = email.Split('@')[0];

        var usernameExists = true;

        while (usernameExists)
        {
            usernameExists = await _context.Users
                .AnyAsync(u => u.Username.ToLower() == username.ToLower());

            if (usernameExists)
            {
                username = $"{email.Split('@')[0]}{Random.Shared.Next(1000, 9999)}";
            }
        }
        
        var newUser = new User
        {
            Username = username,
            Email = email,
            FirstName = string.IsNullOrWhiteSpace(firstName)
                ? "User"
                : firstName,
            LastName = lastName,
            ProfileImage = profilePicture,
            IsEmailVerified = true,
            PasswordHash = string.Empty
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();
        
        var externalLogin = new ExternalLogin
        {
            UserId = newUser.Id,
            Provider = provider,
            ProviderUserId = externalUserId,
            User = newUser
        };
        _context.ExternalLogins.Add(externalLogin);
        await _context.SaveChangesAsync();

        var newUserResponse = new AuthResponse
        {
            Token = _jwtService.GenerateToken(newUser),
            UserId = newUser.Id,
            FirstName = newUser.FirstName,
            LastName = newUser.LastName,
            Email = newUser.Email,
        };
        return ModelResult<AuthResponse>.Success(newUserResponse);
    }
    
    private sealed class MicrosoftLinkTokenPayload
    {
        public int UserId { get; init; }
        public string ProviderUserId { get; init; } = string.Empty;
        public string Email { get; init; } = string.Empty;
        public long ExpiresAtUnixSeconds { get; init; }
    }
}
