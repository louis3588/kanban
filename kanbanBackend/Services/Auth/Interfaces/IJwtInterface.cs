using kanbanBackend.Models;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IJwtInterface
{
    string GenerateToken(User user);
}