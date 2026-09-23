using System.Security.Cryptography;
using System.Text;
using kanbanBackend.Data;
using kanbanBackend.Models;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services;

public class EmailConfirmationService
{
    private readonly KanbanDbContext _context;

    public EmailConfirmationService(KanbanDbContext context)
    {
        _context = context;
    }

    public async Task<string> GenerateEmailConfirmationTokenAsync(User user)
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var token = Convert.ToBase64String(tokenBytes);
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        
        user.EmailConfirmationTokenHash = tokenHash;
        user.EmailConfirmationTokenExpiration = DateTime.UtcNow.AddMinutes(30);

        await _context.SaveChangesAsync();
        return token;
    }

    public async Task<ModelResult<User>> ConfirmEmailAsync(int userId, string token)
    {
        var user = await _context
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return ModelResult<User>.Failure($"User with id {userId} not found");
        }

        if (!user.IsEmailVerified && String.IsNullOrEmpty(user.EmailConfirmationTokenHash))
        {
            return ModelResult<User>.Failure($"User has not got a token");
        }

        if (user.IsEmailVerified)
        {
            return ModelResult<User>.Success(user);
        }

        if (user.EmailConfirmationTokenExpiration < DateTime.UtcNow)
        {
            return ModelResult<User>.Failure($"Token has expired");
        }
        
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        if (!CryptographicOperations.FixedTimeEquals(
                Convert.FromHexString(user.EmailConfirmationTokenHash), 
                Convert.FromHexString(tokenHash)))
        {
            return ModelResult<User>.Failure($"Token has expired");
        }
        else
        {
            user.IsEmailVerified = true;
            user.EmailConfirmationTokenHash = null;
            user.EmailConfirmationTokenExpiration = null;
            await _context.SaveChangesAsync();
            return ModelResult<User>.Success(user);
        }
    }
}