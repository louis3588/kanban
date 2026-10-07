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

    public AuthService(KanbanDbContext context, IPasswordHasher<User> passwordHasher, IJwtInterface jwtService,
        IEmailInterface emailService, IEmailConfirmationInterface emailConfirmationService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
        _emailService = emailService;
        _emailConfirmationService = emailConfirmationService;
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

    public async Task<ModelResult<AuthResponse>> RegisterGoogleUser(
        string googleUserId, string email, string? firstName, string? lastName,
        string? profilePicture)
    {
        var existingUser = await _context.ExternalLogins
            .Include(e => e.User)
            .FirstOrDefaultAsync(e =>
                e.Provider == ExternalLoginProvider.Google &&
                e.ProviderUserId == googleUserId);
        
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
        
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == email.ToLower());

        if (emailExists)
        {
            return ModelResult<AuthResponse>.Failure("An account with this email already exists. Please sign in " +
                                                     "using your existing account and link your Google account.");
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
            Provider = ExternalLoginProvider.Google,
            ProviderUserId = googleUserId
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