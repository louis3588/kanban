using System.Security.Cryptography;
using System.Text;
using kanbanBackend.Data;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services.Auth;

public class EmailConfirmationService : IEmailConfirmationInterface
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
            
            await using var transaction =
                await _context.Database.BeginTransactionAsync();
            var settingsExist = await _context.UserSettings
                .AnyAsync(us => us.UserId == user.Id);

            UserSettings? settings = null;
            
            if (!settingsExist)
            {
                var settingsResult = await InitialiseUserSettings(user);

                if (!settingsResult.IsSuccess)
                {
                    return ModelResult<User>.Failure(settingsResult.ErrorMessage ?? "Failed to initialise user settings");
                }
                settings = settingsResult.Value!;
            }
            user.IsEmailVerified = true;
            user.EmailConfirmationTokenHash = null;
            user.EmailConfirmationTokenExpiration = null;

            if (settings != null)
            {
                await _context.UserSettings.AddAsync(settings);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return ModelResult<User>.Success(user);
        }
    }
    
    public async Task<ModelResult<UserSettings>> InitialiseUserSettings(User user)
    {
        var potentialSetting = await _context.UserSettings
            .FirstOrDefaultAsync(us => us.UserId == user.Id);

        if (potentialSetting is not null)
        {
            return ModelResult<UserSettings>.Failure($"User with id {user.Id} already exists");
        }
        
        var settings = new UserSettings
        {
            UserId = user.Id,
            User = user,
            ShowOnlineStatus = true,
            EnableEmailNotifications = false,
            Theme = AppTheme.SepiaLight
        };

        return ModelResult<UserSettings>.Success(settings);
    }
}