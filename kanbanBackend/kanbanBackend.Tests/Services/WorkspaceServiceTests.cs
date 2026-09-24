using System.Security.Claims;
using kanbanBackend.Data;
using kanbanBackend.Models;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Dashboard;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Tests.Services;


public class WorkspaceServiceTests
{
    private static KanbanDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<KanbanDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new KanbanDbContext(options);
    }

    private static CurrentUserService CreateCurrentUserService(
        int? userId)
    {
        var httpContext = new DefaultHttpContext();

        if (userId.HasValue)
        {
            httpContext.User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    new[]
                    {
                        new Claim(
                            "sub",
                            userId.Value.ToString())
                    },
                    "TestAuthentication"));
        }

        var httpContextAccessor = new HttpContextAccessor
        {
            HttpContext = httpContext
        };

        return new CurrentUserService(httpContextAccessor);
    }

    private static async Task<User> CreateUser(
        KanbanDbContext dbContext,
        int id = 1)
    {
        var user = new User
        {
            Id = id,
            Username = $"user{id}",
            Email = $"user{id}@test.com",
            PasswordHash = "test-password",
            FirstName = $"User{id}",
            IsEmailVerified = true
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        return user;
    }

    private static WorkspaceService CreateWorkspaceService(
        KanbanDbContext dbContext,
        int? userId)
    {
        var currentUser = CreateCurrentUserService(userId);

        var authService = new WorkspaceAuthService(dbContext);

        return new WorkspaceService(
            dbContext,
            currentUser,
            authService);
    }

    [Fact]
    public async Task CreateWorkspaceAsync_CreatesWorkspaceAndOwnerMembership()
    {
        await using var dbContext = CreateDbContext();

        var user = await CreateUser(dbContext);

        var service = CreateWorkspaceService(
            dbContext,
            user.Id);

        var result = await service.CreateWorkspaceAsync(
            "My Workspace");

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);

        Assert.Equal(
            "My Workspace",
            result.Value!.Name);

        Assert.Equal(
            "Owner",
            result.Value.Role);

        var workspace = await dbContext.Workspaces
            .FirstOrDefaultAsync();

        Assert.NotNull(workspace);

        Assert.Equal(
            "My Workspace",
            workspace!.Name);

        var membership = await dbContext.WorkspaceMembers
            .FirstOrDefaultAsync();

        Assert.NotNull(membership);

        Assert.Equal(user.Id, membership!.UserId);
        Assert.Equal(workspace.Id, membership.WorkspaceId);
        Assert.Equal("Owner", membership.Role);
    }

    [Fact]
    public async Task CreateWorkspaceAsync_FailsWhenUserCannotBeIdentified()
    {
        await using var dbContext = CreateDbContext();

        var service = CreateWorkspaceService(
            dbContext,
            null);

        var result = await service.CreateWorkspaceAsync(
            "My Workspace");

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "User could not be identified",
            result.ErrorMessage);
    }

    [Fact]
    public async Task CreateWorkspaceAsync_FailsWhenUserDoesNotExist()
    {
        await using var dbContext = CreateDbContext();

        var service = CreateWorkspaceService(
            dbContext,
            999);

        var result = await service.CreateWorkspaceAsync(
            "My Workspace");

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "User could not be identified",
            result.ErrorMessage);
    }

    [Fact]
    public async Task CreateWorkspaceAsync_FailsWhenNameIsEmpty()
    {
        await using var dbContext = CreateDbContext();

        var user = await CreateUser(dbContext);

        var service = CreateWorkspaceService(
            dbContext,
            user.Id);

        var result = await service.CreateWorkspaceAsync(
            "   ");

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "Workspace name cannot be empty",
            result.ErrorMessage);
    }

    [Fact]
    public async Task CreateWorkspaceAsync_FailsWhenNameIsTooLong()
    {
        await using var dbContext = CreateDbContext();

        var user = await CreateUser(dbContext);

        var service = CreateWorkspaceService(
            dbContext,
            user.Id);

        var name = new string('a', 101);

        var result = await service.CreateWorkspaceAsync(name);

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "Workspace name cannot exceed 100 chars",
            result.ErrorMessage);
    }

    [Fact]
    public async Task GetWorkspacesAsync_ReturnsOnlyUserWorkspaces()
    {
        await using var dbContext = CreateDbContext();

        var user1 = await CreateUser(dbContext, 1);
        var user2 = await CreateUser(dbContext, 2);

        var workspace1 = new Workspace
        {
            Name = "Workspace One"
        };

        var workspace2 = new Workspace
        {
            Name = "Workspace Two"
        };

        var workspace3 = new Workspace
        {
            Name = "Workspace Three"
        };

        dbContext.Workspaces.AddRange(
            workspace1,
            workspace2,
            workspace3);

        dbContext.WorkspaceMembers.AddRange(
            new WorkspaceMember
            {
                UserId = user1.Id,
                Workspace = workspace1,
                Role = "Owner"
            },
            new WorkspaceMember
            {
                UserId = user1.Id,
                Workspace = workspace2,
                Role = "Member"
            },
            new WorkspaceMember
            {
                UserId = user2.Id,
                Workspace = workspace3,
                Role = "Owner"
            });

        await dbContext.SaveChangesAsync();

        var service = CreateWorkspaceService(
            dbContext,
            user1.Id);

        var result = await service.GetWorkspacesAsync();

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);

        Assert.Equal(2, result.Value!.Count);

        Assert.Contains(
            result.Value,
            workspace => workspace.Name == "Workspace One");

        Assert.Contains(
            result.Value,
            workspace => workspace.Name == "Workspace Two");

        Assert.DoesNotContain(
            result.Value,
            workspace => workspace.Name == "Workspace Three");
    }

    [Fact]
    public async Task GetWorkspacesAsync_ReturnsCorrectRoles()
    {
        await using var dbContext = CreateDbContext();

        var user = await CreateUser(dbContext);

        var ownerWorkspace = new Workspace
        {
            Name = "Owner Workspace"
        };

        var memberWorkspace = new Workspace
        {
            Name = "Member Workspace"
        };

        dbContext.Workspaces.AddRange(
            ownerWorkspace,
            memberWorkspace);

        dbContext.WorkspaceMembers.AddRange(
            new WorkspaceMember
            {
                UserId = user.Id,
                Workspace = ownerWorkspace,
                Role = "Owner"
            },
            new WorkspaceMember
            {
                UserId = user.Id,
                Workspace = memberWorkspace,
                Role = "Member"
            });

        await dbContext.SaveChangesAsync();

        var service = CreateWorkspaceService(
            dbContext,
            user.Id);

        var result = await service.GetWorkspacesAsync();

        Assert.True(result.IsSuccess);

        var ownerResult = result.Value!
            .First(workspace =>
                workspace.Name == "Owner Workspace");

        var memberResult = result.Value!
            .First(workspace =>
                workspace.Name == "Member Workspace");

        Assert.Equal("Owner", ownerResult.Role);
        Assert.Equal("Member", memberResult.Role);
    }

    [Fact]
    public async Task UpdateWorkspaceNameAsync_UpdatesWorkspaceName()
    {
        await using var dbContext = CreateDbContext();

        var user = await CreateUser(dbContext);

        var workspace = new Workspace
        {
            Name = "Old Name"
        };

        dbContext.Workspaces.Add(workspace);

        dbContext.WorkspaceMembers.Add(
            new WorkspaceMember
            {
                UserId = user.Id,
                Workspace = workspace,
                Role = "Owner"
            });

        await dbContext.SaveChangesAsync();

        var service = CreateWorkspaceService(
            dbContext,
            user.Id);

        var result = await service.UpdateWorkspaceNameAsync(
            workspace.Id,
            "New Name");

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);

        Assert.Equal(
            "New Name",
            result.Value!.Name);

        var updatedWorkspace = await dbContext.Workspaces
            .FindAsync(workspace.Id);

        Assert.Equal(
            "New Name",
            updatedWorkspace!.Name);
    }

    [Fact]
    public async Task UpdateWorkspaceNameAsync_FailsForNonOwner()
    {
        await using var dbContext = CreateDbContext();

        var owner = await CreateUser(dbContext, 1);
        var member = await CreateUser(dbContext, 2);

        var workspace = new Workspace
        {
            Name = "Original Name"
        };

        dbContext.Workspaces.Add(workspace);

        dbContext.WorkspaceMembers.AddRange(
            new WorkspaceMember
            {
                UserId = owner.Id,
                Workspace = workspace,
                Role = "Owner"
            },
            new WorkspaceMember
            {
                UserId = member.Id,
                Workspace = workspace,
                Role = "Member"
            });

        await dbContext.SaveChangesAsync();

        var service = CreateWorkspaceService(
            dbContext,
            member.Id);

        var result = await service.UpdateWorkspaceNameAsync(
            workspace.Id,
            "New Name");

        Assert.False(result.IsSuccess);

        Assert.Equal(
            "You do not have permission to update the name for this workspace",
            result.ErrorMessage);

        var unchangedWorkspace = await dbContext.Workspaces
            .FindAsync(workspace.Id);

        Assert.Equal(
            "Original Name",
            unchangedWorkspace!.Name);
    }

    [Fact]
    public async Task UpdateWorkspaceNameAsync_FailsWhenNameIsEmpty()
    {
        await using var dbContext = CreateDbContext();

        var user = await CreateUser(dbContext);

        var workspace = new Workspace
        {
            Name = "Original Name"
        };

        dbContext.Workspaces.Add(workspace);

        dbContext.WorkspaceMembers.Add(
            new WorkspaceMember
            {
                UserId = user.Id,
                Workspace = workspace,
                Role = "Owner"
            });

        await dbContext.SaveChangesAsync();

        var service = CreateWorkspaceService(
            dbContext,
            user.Id);

        var result = await service.UpdateWorkspaceNameAsync(
            workspace.Id,
            "");

        Assert.False(result.IsSuccess);

        Assert.Equal(
            "Workspace name cannot be empty",
            result.ErrorMessage);
    }

    [Fact]
    public async Task DeleteWorkspaceAsync_DeletesWorkspace()
    {
        await using var dbContext = CreateDbContext();

        var user = await CreateUser(dbContext);

        var workspace = new Workspace
        {
            Name = "Workspace To Delete"
        };

        dbContext.Workspaces.Add(workspace);

        dbContext.WorkspaceMembers.Add(
            new WorkspaceMember
            {
                UserId = user.Id,
                Workspace = workspace,
                Role = "Owner"
            });

        await dbContext.SaveChangesAsync();

        var workspaceId = workspace.Id;

        var service = CreateWorkspaceService(
            dbContext,
            user.Id);

        var result = await service.DeleteWorkspaceAsync(
            workspaceId);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value);

        var deletedWorkspace = await dbContext.Workspaces
            .FindAsync(workspaceId);

        Assert.Null(deletedWorkspace);

        var memberships = await dbContext.WorkspaceMembers
            .Where(member =>
                member.WorkspaceId == workspaceId)
            .ToListAsync();

        Assert.Empty(memberships);
    }

    [Fact]
    public async Task DeleteWorkspaceAsync_FailsForNonOwner()
    {
        await using var dbContext = CreateDbContext();

        var owner = await CreateUser(dbContext, 1);
        var member = await CreateUser(dbContext, 2);

        var workspace = new Workspace
        {
            Name = "Workspace"
        };

        dbContext.Workspaces.Add(workspace);

        dbContext.WorkspaceMembers.AddRange(
            new WorkspaceMember
            {
                UserId = owner.Id,
                Workspace = workspace,
                Role = "Owner"
            },
            new WorkspaceMember
            {
                UserId = member.Id,
                Workspace = workspace,
                Role = "Member"
            });

        await dbContext.SaveChangesAsync();

        var service = CreateWorkspaceService(
            dbContext,
            member.Id);

        var result = await service.DeleteWorkspaceAsync(
            workspace.Id);

        Assert.False(result.IsSuccess);

        Assert.Equal(
            "Only the workspace owner can delete this workspace",
            result.ErrorMessage);

        var existingWorkspace = await dbContext.Workspaces
            .FindAsync(workspace.Id);

        Assert.NotNull(existingWorkspace);
    }
}