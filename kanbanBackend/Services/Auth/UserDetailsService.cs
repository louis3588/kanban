using kanbanBackend.Data;
using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services.Auth;

public class UserDetailsService : IUserDetailsInterface
{
    
    private readonly KanbanDbContext _context;
    private readonly CurrentUserService _currentUser;
    
    public UserDetailsService(KanbanDbContext context,  CurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
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

    public async Task<ModelResult<UserProfileResponse>> EditProfile(string? firstName = null,
        string? profileImage = null, string? lastName = null, string? bio = null)
    {
        var userNotFound = ModelResult<UserProfileResponse>.Failure("User not found");
        var userId = _currentUser.UserId();
        if (userId == null)
        {
            return userNotFound;
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