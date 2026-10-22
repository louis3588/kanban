using kanbanBackend.Data;
using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services.Auth;

public class UserDetailsService : IUserDetailsInterface
{
    
    private readonly KanbanDbContext _context;
    private readonly CurrentUserService _currentUser;
    private readonly IEmailConfirmationInterface _emailConfirmationInterface;
    
    public UserDetailsService(KanbanDbContext context,  CurrentUserService currentUser,
        IEmailConfirmationInterface emailConfirmationInterface)
    {
        _context = context;
        _currentUser = currentUser;
        _emailConfirmationInterface = emailConfirmationInterface;
    }

    private async Task<ModelResult<User>> GetUser(int userId)
    {
        var user = await _context
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return ModelResult<User>.Failure("User not found");
        }
        return ModelResult<User>.Success(user);
    }

    public async Task<ModelResult<UserProfileResponse>> GetProfile(int userId)
    {
        var potentialUser = await GetUser(userId);
        if (!potentialUser.IsSuccess)
        {
            return ModelResult<UserProfileResponse>.Failure("User not found");
        }

        var user = potentialUser.Value!;
        var response = new UserProfileResponse
        {
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            ProfileImage = user.ProfileImage,
            Bio = user.Bio,
        };

        return ModelResult<UserProfileResponse>.Success(response);
    }

    
    public async Task<ModelResult<UserProfileResponse>> EditUsername(string username, int userId)
    {
        var usernameInUse = await _context.Users
            .AnyAsync(u => u.Username == username && u.Id != userId);

        if (usernameInUse)
        {
            return ModelResult<UserProfileResponse>.Failure("username is already in use");
        }
        
        var potentialUser = await GetUser(userId);
        if (!potentialUser.IsSuccess)
        {
            return ModelResult<UserProfileResponse>.Failure("User not found");
        }
        var user = potentialUser.Value!;
        user.Username = username;
        await _context.SaveChangesAsync();

        var response = new UserProfileResponse
        {
            Username = username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            ProfileImage = user.ProfileImage,
            Bio = user.Bio,
        };
        
        return ModelResult<UserProfileResponse>.Success(response);
    }

    public async Task<ModelResult<UserPreferences>> EditSettings(AppTheme? appTheme = null, int? defaultBoardId = null,
        bool? showOnlineStatus = null, bool? enableEmailNotifications = null, int? userId = null)
    {
        var userNotFound = ModelResult<UserPreferences>.Failure("User not found");
        if (userId == null)
        {
            userId = _currentUser.UserId();
            if (userId == null)
            {
                return userNotFound;
            }
        }
        var settings = await _context.UserSettings
            .FirstOrDefaultAsync(u => u.UserId == userId);
        var potentialUser = await GetUser(userId.Value);
        if (!potentialUser.IsSuccess)
        {
            return userNotFound;
        }
        var user = potentialUser.Value!;
        
        if (settings == null)
        {
            var fetchedSettings = await _emailConfirmationInterface.InitialiseUserSettings(user);
            if (!fetchedSettings.IsSuccess)
            {
                return ModelResult<UserPreferences>.Failure(fetchedSettings.ErrorMessage ?? "Failed to reinitialise settings");
            }
            settings = fetchedSettings.Value!;
            _context.UserSettings.Add(settings);
        }
        
        if (appTheme.HasValue)
        {
            settings.Theme = appTheme.Value;
        }
        if (defaultBoardId.HasValue)
        {
            settings.DefaultBoardId = defaultBoardId.Value;
        }

        if (showOnlineStatus.HasValue)
        {
            settings.ShowOnlineStatus = showOnlineStatus.Value;
        }

        if (enableEmailNotifications.HasValue)
        {
            settings.EnableEmailNotifications = enableEmailNotifications.Value;
        }
        
        await _context.SaveChangesAsync();
        
        var profile = new UserProfileResponse
        {
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            ProfileImage = user.ProfileImage,
            Bio = user.Bio,
        };

        var preferences = new UserPreferences
        {
            Profile = profile,
            Theme = settings.Theme,
            DefaultBoardId = settings.DefaultBoardId,
            ShowOnlineStatus = settings.ShowOnlineStatus,
            EnableEmailNotifications = settings.EnableEmailNotifications,
        };
        return ModelResult<UserPreferences>.Success(preferences);
    }

    public async Task<ModelResult<UserPreferences>> GetPreferences(int userId)
    {
        var userNotFound = ModelResult<UserPreferences>.Failure("User not found");
        var potentialUser = await GetUser(userId);
        if (!potentialUser.IsSuccess)
        {
            return userNotFound;
        }

        var user = potentialUser.Value!;
        var settings = await _context.UserSettings
            .FirstOrDefaultAsync(u => u.UserId == userId);
        
        if (settings == null)
        {
            var potentialSettings = await _emailConfirmationInterface.
                InitialiseUserSettings(user);
            if (!potentialSettings.IsSuccess)
            {
                return userNotFound;
            }

            settings = potentialSettings.Value!;
            _context.UserSettings.Add(settings);
            await _context.SaveChangesAsync();
        }
        
        var profileResponse = new UserProfileResponse
        {
            UserId = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            ProfileImage = user.ProfileImage,
            Bio = user.Bio,
        };

        var preferences = new UserPreferences
        {
            Profile = profileResponse,
            Theme = settings.Theme,
            DefaultBoardId = settings.DefaultBoardId,
            ShowOnlineStatus = settings.ShowOnlineStatus,
            EnableEmailNotifications = settings.EnableEmailNotifications
        };
        return ModelResult<UserPreferences>.Success(preferences);
    }
    
    public async Task<ModelResult<UserProfileResponse>> EditProfile(string? firstName = null,
        string? profileImage = null, string? lastName = null, string? bio = null, int? userId = null)
    {
        var userNotFound = ModelResult<UserProfileResponse>.Failure("User not found");
        if (userId == null)
        {
            userId = _currentUser.UserId();
            if (userId == null)
            {
                return userNotFound;
            }
        }
        
        var fetchedUser = await GetUser(userId.Value);
        if (!fetchedUser.IsSuccess)
        {
            return userNotFound;
        }
        
        var user = fetchedUser.Value!;

        if (!user.IsEmailVerified)
        {
            return ModelResult<UserProfileResponse>.Failure("Cannot edit profile if not verified");
        }

        if (!String.IsNullOrEmpty(firstName))
        {
            user.FirstName = firstName;
        }

        if (!String.IsNullOrEmpty(lastName))
        {
            user.LastName = lastName;
        }

        if (!String.IsNullOrEmpty(bio))
        {
            user.Bio = bio;
        }

        if (!String.IsNullOrEmpty(profileImage))
        {
            user.ProfileImage = profileImage;
        }
        
        await _context.SaveChangesAsync();

        var response = new UserProfileResponse
        {
            UserId = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            ProfileImage = user.ProfileImage,
            Bio = user.Bio,
        };

        return ModelResult<UserProfileResponse>.Success(response);
    }
}