using kanbanBackend.Data;
using kanbanBackend.DTOs.Auth;
using kanbanBackend.Models;
using kanbanBackend.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services;

public class AuthService : IAuthInterface
{
    private readonly KanbanDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly JwtService _jwtService;
    private readonly EmailService _emailService;
    private readonly EmailConfirmationService _emailConfirmationService;

    public AuthService(KanbanDbContext context, IPasswordHasher<User> passwordHasher, JwtService jwtService, EmailService emailService, EmailConfirmationService emailConfirmationService)
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
            .FirstOrDefaultAsync(u => u.Username == request.Username);
        
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
}