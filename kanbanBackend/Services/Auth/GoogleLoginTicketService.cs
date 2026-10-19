using kanbanBackend.Services.Auth.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace kanbanBackend.Services.Auth;

public class GoogleLoginTicketService : IGoogleTicketInterface
{
    private readonly IDataProtector _protector;

    public GoogleLoginTicketService(IDataProtectionProvider dataProtectionProvider)
    {
        _protector = dataProtectionProvider.CreateProtector("Kanban.GoogleLoginTicket");
    }

    public string CreateTicket(int userId)
    {
        var payload = $"{userId}:{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        return _protector.Protect(payload);
    }

    public int ValidateTicket(string ticket)
    {
        try
        {
            var payload = _protector.Unprotect(ticket);

            var parts = payload.Split(':');

            if (parts.Length != 2)
            {
                throw new InvalidOperationException();
            }

            if (!int.TryParse(parts[0], out var userId))
            {
                throw new InvalidOperationException();
            }

            if (!long.TryParse(parts[1], out var issuedAt))
            {
                throw new InvalidOperationException();
            }

            var issued =
                DateTimeOffset.FromUnixTimeSeconds(issuedAt);

            var age = DateTimeOffset.UtcNow - issued;

            if (age > TimeSpan.FromMinutes(2) ||
                age < TimeSpan.Zero)
            {
                throw new InvalidOperationException();
            }

            return userId;
        }
        catch
        {
            throw new InvalidOperationException(
                "Invalid or expired Google login ticket.");
        }
    }
}