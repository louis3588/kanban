using kanbanBackend.Data;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;
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

    public AuthService(KanbanDbContext context, IPasswordHasher<User> passwordHasher, IJwtInterface jwtService,
        IEmailInterface emailService, IEmailConfirmationInterface emailConfirmationService, IHttpClientFactory  httpClientFactory)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
        _emailService = emailService;
        _emailConfirmationService = emailConfirmationService;
        _httpClientFactory = httpClientFactory;
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
            //links existing users with their Google id
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
}