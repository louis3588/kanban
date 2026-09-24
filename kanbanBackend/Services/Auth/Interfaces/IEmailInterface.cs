using kanbanBackend.Models;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IEmailInterface
{
    Task SendEmailConfirmationAsync(string email, string url, string firstName);
}