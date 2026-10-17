using kanbanBackend.Data;
using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace kanbanBackend.Services.Auth;

public class EmailService :  IEmailInterface
{
    private readonly string _email;
    private readonly string _password;
    private readonly KanbanDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IEmailTemplateUtil _emailTemplateUtil;

    public EmailService(KanbanDbContext  dbContext,
        IPasswordHasher<User> passwordHasher, IEmailTemplateUtil emailTemplateUtil)
    {
        _email = Environment.GetEnvironmentVariable("EMAILADDRESS")
            ?? throw new InvalidOperationException(
                "Email address environment variable is not defined."
                );

        _password = Environment.GetEnvironmentVariable("EMAILAPPPASSWORD")
                    ?? throw new InvalidOperationException(
                        "Password environment variable is not defined."
                    );

        _dbContext = dbContext;
        _passwordHasher =  passwordHasher;
        _emailTemplateUtil = emailTemplateUtil;
    }

    public async Task<ModelResult<UserProfileResponse>> UpdatePassword(int userId, string password)
    {
        var user = await _dbContext
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return ModelResult<UserProfileResponse>.Failure("User not found");
        }
        
        if (!user.IsEmailVerified)
        {
            return ModelResult<UserProfileResponse>.Failure("Email not verified");
        }
        
        user.PasswordHash = _passwordHasher.HashPassword(user, password);
        user.EmailConfirmationTokenExpiration = null;
        user.EmailConfirmationTokenHash = null;
        await _dbContext.SaveChangesAsync();

        var result = new UserProfileResponse
        {
            UserId = userId,
            Username = user.Username,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Bio = user.Bio,
            ProfileImage = user.ProfileImage,
        };
        return ModelResult<UserProfileResponse>.Success(result);
    }
    
    public async Task<ModelResult<bool>> PasswordReset(string email)
    {
        var user = await  _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
        {
            return ModelResult<bool>.Failure("Email not found");
        }
        if (!user.IsEmailVerified)
        {
            return ModelResult<bool>.Failure("Email not verified");
        }
        user.EmailConfirmationTokenHash = Guid.NewGuid().ToString();
        user.EmailConfirmationTokenExpiration = DateTime.UtcNow.AddMinutes(30);
        await _dbContext.SaveChangesAsync();
        
        
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTENDURL")
                          ?? throw new InvalidOperationException("Frontend URL is missing");
        var resetPasswordUrl =
            $"{frontendUrl}/(auth)/reset-password?token={user.EmailConfirmationTokenHash}&userId={user.Id}";

        await SendForgotPasswordAsync(user, resetPasswordUrl);
        return ModelResult<bool>.Success(true);
    }

    public async Task SendEmailConfirmationAsync(
    string recipientEmail,
    string confirmationUrl,
    string? firstName = null)
    {
        var body = await _emailTemplateUtil.RenderAsync(
            "ConfirmEmail.html",
            new Dictionary<string, string>
            {
                ["FirstName"] = string.IsNullOrWhiteSpace(firstName)
                    ? "there"
                    : firstName,
                ["ConfirmationUrl"] = confirmationUrl
            });

        await SendHtmlEmailAsync(
            recipientEmail,
            "Hey! Please confirm your account!",
            body);
    }

    private async Task SendForgotPasswordAsync(
        User user,
        string resetPasswordUrl)
    {
        var body = await _emailTemplateUtil.RenderAsync(
            "ForgotPassword.html",
            new Dictionary<string, string>
            {
                ["FirstName"] = string.IsNullOrWhiteSpace(user.FirstName)
                    ? "there"
                    : user.FirstName,
                ["ResetPasswordUrl"] = resetPasswordUrl
            });

        await SendHtmlEmailAsync(
            user.Email,
            "Password reset request for your Kanban account",
            body);
    }

    public async Task SendMicrosoftLinkConfirmationAsync(
        string recipientEmail,
        string confirmationUrl,
        string? firstName = null)
    {
        var body = await _emailTemplateUtil.RenderAsync(
            "MicrosoftLinkConfirmation.html",
            new Dictionary<string, string>
            {
                ["FirstName"] = string.IsNullOrWhiteSpace(firstName)
                    ? "there"
                    : firstName,
                ["ConfirmationUrl"] = confirmationUrl
            });

        await SendHtmlEmailAsync(
            recipientEmail,
            "You requested to link your Microsoft account to your Kanban account",
            body);
    }

    private async Task SendHtmlEmailAsync(
        string recipientEmail,
        string subject,
        string htmlBody)
    {
        var message = new MimeMessage();

        message.From.Add(new MailboxAddress("Kanban", _email));
        message.To.Add(MailboxAddress.Parse(recipientEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder
        {
            HtmlBody = htmlBody
        }.ToMessageBody();

        using var smtp = new SmtpClient();

        await smtp.ConnectAsync(
            "smtp.gmail.com",
            587,
            SecureSocketOptions.StartTls);

        await smtp.AuthenticateAsync(_email, _password);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }
    
}