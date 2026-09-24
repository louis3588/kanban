using kanbanBackend.Data;
using kanbanBackend.Models;
using kanbanBackend.Services.Interfaces;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services;

public class UserDetailsService : IUserDetailsInterface
{
    
    private readonly KanbanDbContext _context;
    
    public UserDetailsService(KanbanDbContext context)
    {
        _context = context;
    }

    public async Task<ModelResult<User>> EditProfile(int userId, string firstName = "",
        string profileImage = "", string lastName = "", string bio = "")
    {
        var user = await _context
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return ModelResult<User>.Failure("User not found");
        }

        if (!user.IsEmailVerified)
        {
            return ModelResult<User>.Failure("Cannot edit profile if not verified");
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
        return ModelResult<User>.Success(user);
    }
}