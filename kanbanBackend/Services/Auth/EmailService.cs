using kanbanBackend.Data;
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

    public EmailService(KanbanDbContext  dbContext,
        IPasswordHasher<User> passwordHasher)
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
    }

    public async Task<ModelResult<bool>> UpdatePassword(int userId, string password)
    {
        var user = await _dbContext
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return ModelResult<bool>.Failure("User not found");
        }
        
        if (!user.IsEmailVerified)
        {
            return ModelResult<bool>.Failure("Email not verified");
        }
        
        user.PasswordHash = _passwordHasher.HashPassword(user, password);
        await _dbContext.SaveChangesAsync();
        return ModelResult<bool>.Success(true);
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

    public async Task SendEmailConfirmationAsync(string recipientEmail, string confirmationUrl, String firstName = null)
    {
        var message = new MimeMessage();
        
        message.From.Add(new MailboxAddress("Kanban", _email));
        message.To.Add(MailboxAddress.Parse(recipientEmail));
        
        message.Subject = "Hey! Please confirm your account!";
        var body = ConfirmEmailBody(firstName, confirmationUrl);
        message.Body = new BodyBuilder
        {
            HtmlBody = body
        }.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(_email, _password);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }

    private async Task SendForgotPasswordAsync(User user, String resetPasswordUrl)
    {
        var message = new MimeMessage();
        
        message.From.Add(new MailboxAddress("Kanban", _email));
        message.To.Add(MailboxAddress.Parse(user.Email));
        message.Subject = "Password reset request for your Kanban account";
        
        var body = ForgotPasswordBody(user.FirstName, resetPasswordUrl);
        message.Body = new BodyBuilder
        {
            HtmlBody = body
        }.ToMessageBody();
        
        using var smtp = new SmtpClient();
        await smtp.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(_email, _password);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }

    private static string ForgotPasswordBody(
        string firstName,
        string resetPasswordUrl)
    {
        return $"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset your Kanban password</title>
            </head>

            <body style="
                margin: 0;
                padding: 0;
                background-color: #8f7257;
                font-family: Arial, Helvetica, sans-serif;
                color: #4b3828;
            ">

                <div style="
                    width: 100%;
                    padding: 40px 0;
                    background-color: #8f7257;
                ">

                    <div style="
                        max-width: 560px;
                        margin: 0 auto;
                        background-color: #f9f0e1;
                        border-radius: 16px;
                        overflow: hidden;
                        border: 1px solid #d7c3a7;
                    ">

                        <div style="
                            padding: 28px 32px;
                            background-color: #5c4633;
                            text-align: center;
                        ">
                            <h1 style="
                                margin: 0;
                                color: #fff5e6;
                                font-size: 28px;
                                font-weight: 700;
                            ">
                                Kanban
                            </h1>
                        </div>

                        <div style="
                            padding: 40px 32px;
                        ">

                            <h2 style="
                                margin: 0 0 20px 0;
                                font-size: 24px;
                                color: #4b3828;
                            ">
                                Hi {firstName},
                            </h2>

                            <p style="
                                margin: 0 0 16px 0;
                                font-size: 16px;
                                line-height: 1.6;
                                color: #80664b;
                            ">
                                We received a request to reset the password
                                for your Kanban account.
                            </p>

                            <p style="
                                margin: 0 0 28px 0;
                                font-size: 16px;
                                line-height: 1.6;
                                color: #80664b;
                            ">
                                If you made this request, click the button
                                below to choose a new password.
                            </p>

                            <div style="
                                text-align: center;
                                margin: 32px 0;
                            ">
                                <a href="{resetPasswordUrl}" style="
                                    display: inline-block;
                                    padding: 14px 28px;
                                    background-color: #5c4633;
                                    color: #fff5e6;
                                    text-decoration: none;
                                    border-radius: 10px;
                                    font-size: 16px;
                                    font-weight: 600;
                                ">
                                    Reset my password
                                </a>
                            </div>

                            <p style="
                                margin: 0 0 12px 0;
                                font-size: 14px;
                                line-height: 1.6;
                                color: #80664b;
                            ">
                                This password reset link will expire in
                                30 minutes.
                            </p>

                            <p style="
                                margin: 24px 0 0 0;
                                font-size: 13px;
                                line-height: 1.6;
                                color: #95765a;
                            ">
                                If you did not request a password reset,
                                you can safely ignore this email. Your
                                password will remain unchanged.
                            </p>

                            <p style="
                                margin: 24px 0 0 0;
                                font-size: 13px;
                                line-height: 1.6;
                                color: #95765a;
                            ">
                                If the button doesn't work, copy and paste
                                the following link into your browser:
                            </p>

                            <p style="
                                margin: 8px 0 0 0;
                                font-size: 13px;
                                line-height: 1.6;
                                word-break: break-all;
                            ">
                                <a href="{resetPasswordUrl}" style="
                                    color: #5c4633;
                                ">
                                    {resetPasswordUrl}
                                </a>
                            </p>

                        </div>

                        <div style="
                            padding: 20px 32px;
                            background-color: #f3e7d0;
                            border-top: 1px solid #d7c3a7;
                            text-align: center;
                        ">
                            <p style="
                                margin: 0;
                                font-size: 12px;
                                line-height: 1.5;
                                color: #95765a;
                            ">
                                You received this email because a password
                                reset was requested for your Kanban account.
                            </p>
                        </div>

                    </div>

                </div>

            </body>
            </html>
            """;
    }

    private static string ConfirmEmailBody(
        string firstName,
        string confirmationUrl)
    {
        return $"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirm your Kanban account</title>
            </head>

            <body style="
                margin: 0;
                padding: 0;
                background-color: #8f7257;
                font-family: Arial, Helvetica, sans-serif;
                color: #4b3828;
            ">

                <div style="
                    width: 100%;
                    padding: 40px 0;
                    background-color: #8f7257;
                ">

                    <div style="
                        max-width: 560px;
                        margin: 0 auto;
                        background-color: #f9f0e1;
                        border-radius: 16px;
                        overflow: hidden;
                        border: 1px solid #d7c3a7;
                    ">

                        <div style="
                            padding: 28px 32px;
                            background-color: #5c4633;
                            text-align: center;
                        ">
                            <h1 style="
                                margin: 0;
                                color: #fff5e6;
                                font-size: 28px;
                                font-weight: 700;
                            ">
                                Kanban
                            </h1>
                        </div>

                        <div style="
                            padding: 40px 32px;
                        ">

                            <h2 style="
                                margin: 0 0 20px 0;
                                font-size: 24px;
                                color: #4b3828;
                            ">
                                Hi {firstName},
                            </h2>

                            <p style="
                                margin: 0 0 16px 0;
                                font-size: 16px;
                                line-height: 1.6;
                                color: #80664b;
                            ">
                                Thanks for creating your Kanban account.
                            </p>

                            <p style="
                                margin: 0 0 28px 0;
                                font-size: 16px;
                                line-height: 1.6;
                                color: #80664b;
                            ">
                                Before you can start using your account,
                                please confirm your email address by clicking
                                the button below.
                            </p>

                            <div style="
                                text-align: center;
                                margin: 32px 0;
                            ">
                                <a href="{confirmationUrl}" style="
                                    display: inline-block;
                                    padding: 14px 28px;
                                    background-color: #5c4633;
                                    color: #fff5e6;
                                    text-decoration: none;
                                    border-radius: 10px;
                                    font-size: 16px;
                                    font-weight: 600;
                                ">
                                    Confirm my email
                                </a>
                            </div>

                            <p style="
                                margin: 0 0 12px 0;
                                font-size: 14px;
                                line-height: 1.6;
                                color: #80664b;
                            ">
                                This confirmation link will expire in
                                30 minutes.
                            </p>

                            <p style="
                                margin: 24px 0 0 0;
                                font-size: 13px;
                                line-height: 1.6;
                                color: #95765a;
                            ">
                                If the button doesn't work, copy and paste
                                the following link into your browser:
                            </p>

                            <p style="
                                margin: 8px 0 0 0;
                                font-size: 13px;
                                line-height: 1.6;
                                word-break: break-all;
                            ">
                                <a href="{confirmationUrl}" style="
                                    color: #5c4633;
                                ">
                                    {confirmationUrl}
                                </a>
                            </p>

                        </div>

                        <div style="
                            padding: 20px 32px;
                            background-color: #f3e7d0;
                            border-top: 1px solid #d7c3a7;
                            text-align: center;
                        ">
                            <p style="
                                margin: 0;
                                font-size: 12px;
                                line-height: 1.5;
                                color: #95765a;
                            ">
                                You received this email because an account
                                was created using this email address.
                            </p>
                        </div>

                    </div>

                </div>

            </body>
            </html>
            """;
    }
}