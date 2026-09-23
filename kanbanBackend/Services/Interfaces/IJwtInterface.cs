using kanbanBackend.Models;

namespace kanbanBackend.Services.Interfaces;

public interface IJwtInterface
{
    string GenerateToken(User user);
}