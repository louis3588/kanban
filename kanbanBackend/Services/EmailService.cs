using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace kanbanBackend.Services;

public class EmailService
{
    private readonly string _email;
    private readonly string _password;

    public EmailService()
    {
        _email = Environment.GetEnvironmentVariable("EMAILADDRESS")
            ?? throw new InvalidOperationException(
                "Email address environment variable is not defined."
                );

        _password = Environment.GetEnvironmentVariable("EMAILAPPPASSWORD")
                    ?? throw new InvalidOperationException(
                        "Password environment variable is not defined."
                    );
    }

    public async Task SendEmailConfirmationAsync(String recipientEmail, String confirmationUrl, String firstName = null)
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

    private static string ConfirmEmailBody(string firstName, string confirmationUrl)
    {
        return  $"""
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
                background-color: #f4f4f5;
                font-family: Arial, Helvetica, sans-serif;
                color: #18181b;
            ">

                <div style="
                    width: 100%;
                    padding: 40px 0;
                    background-color: #f4f4f5;
                ">

                    <div style="
                        max-width: 560px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    ">

                        <div style="
                            padding: 28px 32px;
                            background-color: #18181b;
                            text-align: center;
                        ">
                            <h1 style="
                                margin: 0;
                                color: #ffffff;
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
                                color: #18181b;
                            ">
                                Hi {firstName},
                            </h2>

                            <p style="
                                margin: 0 0 16px 0;
                                font-size: 16px;
                                line-height: 1.6;
                                color: #52525b;
                            ">
                                Thanks for creating your Kanban account.
                            </p>

                            <p style="
                                margin: 0 0 28px 0;
                                font-size: 16px;
                                line-height: 1.6;
                                color: #52525b;
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
                                    background-color: #18181b;
                                    color: #ffffff;
                                    text-decoration: none;
                                    border-radius: 8px;
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
                                color: #71717a;
                            ">
                                This confirmation link will expire in
                                30 minutes.
                            </p>

                            <p style="
                                margin: 24px 0 0 0;
                                font-size: 13px;
                                line-height: 1.6;
                                color: #a1a1aa;
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
                                    color: #52525b;
                                ">
                                    {confirmationUrl}
                                </a>
                            </p>

                        </div>

                        <div style="
                            padding: 20px 32px;
                            background-color: #fafafa;
                            border-top: 1px solid #e4e4e7;
                            text-align: center;
                        ">
                            <p style="
                                margin: 0;
                                font-size: 12px;
                                color: #a1a1aa;
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