using kanbanBackend.Data;
using kanbanBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Tests;

//Tests if the db context can be created in memory
public class KanbanDbContextTests
{
    [Fact]
    public void DBContext_CanBeCreated()
    {
        var options = new DbContextOptionsBuilder<KanbanDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        using var context = new KanbanDbContext(options);
        
        Assert.NotNull(context);
    }
    
    //Tests if a mock user can be created
    [Fact]
    public async Task CanCreateUser()
    {
        var options = new DbContextOptionsBuilder<KanbanDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        await using var context = new KanbanDbContext(options);

        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = "hashed-password"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var savedUser = await context.Users
            .SingleAsync(u => u.Username == "testuser");

        Assert.Equal("testuser", savedUser.Username);
        Assert.Equal("test@example.com", savedUser.Email);
        Assert.Equal("hashed-password", savedUser.PasswordHash);
    }
}