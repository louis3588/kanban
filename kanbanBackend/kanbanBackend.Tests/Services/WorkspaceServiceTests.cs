using System.Security.Claims;
using kanbanBackend.Data;
using kanbanBackend.DTOs.Dashboard.Workspaces;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Dashboard;
using kanbanBackend.Services.Dashboard.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;

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
        var memberService = new Mock<IWorkspaceMemberInterface>();

        var authService = new WorkspaceAuthService(dbContext);

        return new WorkspaceService(
            dbContext,
            currentUser,
            authService,
            memberService.Object);
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
            result.Value.Role.ToString());

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
        Assert.Equal("Owner", membership.Role.ToString());
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
                Role = WorkspaceRole.Owner
            },
            new WorkspaceMember
            {
                UserId = user1.Id,
                Workspace = workspace2,
                Role = WorkspaceRole.Member
            },
            new WorkspaceMember
            {
                UserId = user2.Id,
                Workspace = workspace3,
                Role = WorkspaceRole.Owner
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
                Role = WorkspaceRole.Owner
            },
            new WorkspaceMember
            {
                UserId = user.Id,
                Workspace = memberWorkspace,
                Role = WorkspaceRole.Member
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

        Assert.Equal("Owner", ownerResult.Role.ToString());
        Assert.Equal("Member", memberResult.Role.ToString());
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
                Role = WorkspaceRole.Owner
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
                Role = WorkspaceRole.Owner
            },
            new WorkspaceMember
            {
                UserId = member.Id,
                Workspace = workspace,
                Role = WorkspaceRole.Member
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
                Role = WorkspaceRole.Owner
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
                Role = WorkspaceRole.Owner
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
                Role = WorkspaceRole.Owner
            },
            new WorkspaceMember
            {
                UserId = member.Id,
                Workspace = workspace,
                Role = WorkspaceRole.Member
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


    [Fact]
    public async Task GetWorkspaceAsync_FailsWhenUserIsNotAuthenticated()
    {
        using var fixture = new WorkspaceOverviewFixture();

        var result = await fixture.As(null)
            .GetWorkspaceAsync(OverviewWorkspaceId);

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "User could not be identified",
            result.ErrorMessage);
    }

    [Fact]
    public async Task GetWorkspaceAsync_FailsWhenUserDoesNotExist()
    {
        using var fixture = new WorkspaceOverviewFixture();

        await fixture.SeedAsync();

        var result = await fixture.As(999)
            .GetWorkspaceAsync(OverviewWorkspaceId);

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "User could not be identified",
            result.ErrorMessage);
    }

    [Fact]
    public async Task GetWorkspaceAsync_RejectsNonMember()
    {
        using var fixture = new WorkspaceOverviewFixture();

        await fixture.SeedAsync();

        var result = await fixture.As(OutsiderId)
            .GetWorkspaceAsync(OverviewWorkspaceId);

        Assert.False(result.IsSuccess);
        Assert.Equal(
            "You do not have permission to access this workspace",
            result.ErrorMessage);

        fixture.MemberService.Verify(
            s => s.ToResponse(It.IsAny<WorkspaceMember>()),
            Times.Never);
    }

    [Fact]
    public async Task GetWorkspaceAsync_ReturnsWorkspaceMetadata()
    {
        using var fixture = new WorkspaceOverviewFixture();

        await fixture.SeedAsync();

        var result = await fixture.As(OwnerId)
            .GetWorkspaceAsync(OverviewWorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.NotNull(result.Value);

        var workspace = result.Value!;

        Assert.Equal(OverviewWorkspaceId, workspace.WorkspaceId);
        Assert.Equal("John Smith Development", workspace.Name);

        Assert.Equal(
            new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc),
            workspace.CreatedAt);

        Assert.Equal(
            "https://example.com/workspace.png",
            workspace.ImageUrl);

        Assert.Equal(WorkspaceRole.Owner, workspace.Role);
    }

    [Fact]
    public async Task GetWorkspaceAsync_ReturnsOnlyWorkspaceBoardsInPositionOrder()
    {
        using var fixture = new WorkspaceOverviewFixture();

        await fixture.SeedAsync();

        var result = await fixture.As(OwnerId)
            .GetWorkspaceAsync(OverviewWorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);

        var boards = result.Value!.Boards;

        Assert.Equal(3, boards.Count);

        Assert.Equal(
            new[] { 101, 102, 100 },
            boards.Select(b => b.BoardId));

        Assert.Equal(
            new[] { 0, 1, 2 },
            boards.Select(b => b.Position));

        Assert.Equal(
            new[] { "Frontend", "Testing", "Backend" },
            boards.Select(b => b.Name));

        var backendBoard = Assert.Single(
            boards,
            b => b.BoardId == 100);

        Assert.Equal(
            "https://example.com/backend.png",
            backendBoard.ImageUrl);

        Assert.DoesNotContain(boards, b => b.BoardId == 200);
    }

    [Fact]
    public async Task GetWorkspaceAsync_LoadsWorkspaceMembersWithUsers()
    {
        using var fixture = new WorkspaceOverviewFixture();

        await fixture.SeedAsync();

        var result = await fixture.As(OwnerId)
            .GetWorkspaceAsync(OverviewWorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);

        Assert.Equal(2, result.Value!.Members.Count);

        fixture.MemberService.Verify(
            s => s.ToResponse(It.IsAny<WorkspaceMember>()),
            Times.Exactly(2));
    }

    [Theory]
    [InlineData(WorkspaceRole.Owner, true, true, true, true)]
    [InlineData(WorkspaceRole.Admin, true, true, false, true)]
    [InlineData(WorkspaceRole.Member, true, false, false, false)]
    [InlineData(WorkspaceRole.Viewer, false, false, false, false)]
    public async Task GetWorkspaceAsync_ReturnsPermissionsForRole(
        WorkspaceRole role,
        bool canEditTasks,
        bool canManageBoards,
        bool canManageAdmins,
        bool canManageInvitations)
    {
        using var fixture = new WorkspaceOverviewFixture();

        await fixture.SeedAsync();

        var membership = await fixture.Db.WorkspaceMembers
            .SingleAsync(m =>
                m.WorkspaceId == OverviewWorkspaceId &&
                m.UserId == OwnerId);

        membership.Role = role;
        await fixture.Db.SaveChangesAsync();

        var result = await fixture.As(OwnerId)
            .GetWorkspaceAsync(OverviewWorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);

        var response = result.Value!;
        var permissions = response.Permissions;

        Assert.Equal(role, response.Role);

        Assert.Equal(canEditTasks, permissions.CanEditTasks);
        Assert.Equal(canManageBoards, permissions.CanManageBoards);
        Assert.Equal(canManageAdmins, permissions.CanManageAdmins);
        Assert.Equal(
            canManageInvitations,
            permissions.CanManageInvitations);

        Assert.Equal(
            role is WorkspaceRole.Owner or WorkspaceRole.Admin,
            permissions.CanManageMembers);

        Assert.Equal(
            role == WorkspaceRole.Owner,
            permissions.CanEditWorkspace);

        Assert.Equal(
            role == WorkspaceRole.Owner,
            permissions.CanTransferOwnership);

        if (canManageInvitations)
        {
            var invitation = Assert.Single(response.Invitations);

            Assert.Equal(300, invitation.Id);
            Assert.Equal(OverviewWorkspaceId, invitation.WorkspaceId);
            Assert.Equal(5, invitation.MaxUses);
        }
        else
        {
            Assert.Empty(response.Invitations);
        }
    }

    [Fact]
    public async Task GetWorkspaceAsync_ReturnsEmptyCollectionsWhenWorkspaceHasNone()
    {
        using var fixture = new WorkspaceOverviewFixture();

        await fixture.SeedAsync();

        fixture.Db.Boards.RemoveRange(
            fixture.Db.Boards.Where(b => b.WorkspaceId == OverviewWorkspaceId));

        var invitation = await fixture.Db
            .Set<WorkspaceInvitation>()
            .SingleAsync(i =>
                i.WorkspaceId == OverviewWorkspaceId);

        fixture.Db.Remove(invitation);

        await fixture.Db.SaveChangesAsync();

        var result = await fixture.As(OwnerId)
            .GetWorkspaceAsync(OverviewWorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Empty(result.Value!.Boards);
        Assert.Empty(result.Value.Invitations);

        Assert.Equal(2, result.Value.Members.Count);
    }


    private const int OverviewWorkspaceId = 10;
    private const int OtherWorkspaceId = 20;

    private const int OwnerId = 1;
    private const int MemberId = 2;
    private const int OutsiderId = 3;

    private sealed class WorkspaceOverviewFixture : IDisposable
    {
        public KanbanDbContext Db { get; }

        public Mock<IWorkspaceMemberInterface> MemberService { get; }
            = new();

        public WorkspaceOverviewFixture()
        {
            var options = new DbContextOptionsBuilder<KanbanDbContext>()
                .UseInMemoryDatabase(
                    $"WorkspaceOverview_{Guid.NewGuid():N}")
                .Options;

            Db = new KanbanDbContext(options);

            // Mock only the member-response mapping dependency.
            MemberService
                .Setup(s => s.ToResponse(It.IsAny<WorkspaceMember>()))
                .Returns((WorkspaceMember member) =>
                {

                    Assert.NotNull(member.User);

                    return new WorkspaceMemberResponse();
                });
        }

        public WorkspaceService As(int? userId)
        {
            var claims = userId.HasValue
                ? new[]
                {
                    new Claim("sub", userId.Value.ToString())
                }
                : Array.Empty<Claim>();

            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(
                    new ClaimsIdentity(claims, "TestAuth"))
            };

            var currentUser = new CurrentUserService(
                new HttpContextAccessor
                {
                    HttpContext = httpContext
                });

            var authService = new WorkspaceAuthService(Db);

            return new WorkspaceService(
                Db,
                currentUser,
                authService,
                MemberService.Object);
        }

        public async Task SeedAsync()
        {
            var createdAt = new DateTime(
                2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);

            Db.Users.AddRange(
                new User
                {
                    Id = OwnerId,
                    Username = "johnsmith",
                    FirstName = "John",
                    LastName = "Smith",
                    Email = "john@example.com",
                    PasswordHash = "test-hash",
                    IsEmailVerified = true
                },
                new User
                {
                    Id = MemberId,
                    Username = "alex",
                    FirstName = "Alex",
                    LastName = "Taylor",
                    Email = "alex@example.com",
                    PasswordHash = "test-hash",
                    IsEmailVerified = true
                },
                new User
                {
                    Id = OutsiderId,
                    Username = "outsider",
                    FirstName = "Outside",
                    LastName = "User",
                    Email = "outside@example.com",
                    PasswordHash = "test-hash",
                    IsEmailVerified = true
                }
            );

            Db.Workspaces.AddRange(
                new Workspace
                {
                    Id = OverviewWorkspaceId,
                    Name = "John Smith Development",
                    ImageUrl = "https://example.com/workspace.png",
                    CreatedAt = createdAt
                },
                new Workspace
                {
                    Id = OtherWorkspaceId,
                    Name = "Other Workspace",
                    CreatedAt = createdAt
                }
            );

            Db.WorkspaceMembers.AddRange(
                new WorkspaceMember
                {
                    WorkspaceId = OverviewWorkspaceId,
                    UserId = OwnerId,
                    Role = WorkspaceRole.Owner,
                    JoinedAt = createdAt
                },
                new WorkspaceMember
                {
                    WorkspaceId = OverviewWorkspaceId,
                    UserId = MemberId,
                    Role = WorkspaceRole.Member,
                    JoinedAt = createdAt
                },
                new WorkspaceMember
                {
                    WorkspaceId = OtherWorkspaceId,
                    UserId = OwnerId,
                    Role = WorkspaceRole.Owner,
                    JoinedAt = createdAt
                }
            );

            Db.Boards.AddRange(
                new Board
                {
                    Id = 100,
                    WorkspaceId = OverviewWorkspaceId,
                    Name = "Backend",
                    Position = 2,
                    ImageUrl = "https://example.com/backend.png"
                },
                new Board
                {
                    Id = 101,
                    WorkspaceId = OverviewWorkspaceId,
                    Name = "Frontend",
                    Position = 0
                },
                new Board
                {
                    Id = 102,
                    WorkspaceId = OverviewWorkspaceId,
                    Name = "Testing",
                    Position = 1
                },
                new Board
                {
                    Id = 200,
                    WorkspaceId = OtherWorkspaceId,
                    Name = "Other Board",
                    Position = 0
                }
            );

            Db.AddRange(
                new WorkspaceInvitation
                {
                    Id = 300,
                    WorkspaceId = OverviewWorkspaceId,
                    CreatedByUserId = OwnerId,
                    CodeHash = "test-code-hash",
                    CreatedAtUtc = createdAt,
                    ExpiresAtUtc = createdAt.AddDays(7),
                    RedeemedCount = 0,
                    MaxUses = 5
                },
                new WorkspaceInvitation
                {
                    Id = 301,
                    WorkspaceId = OtherWorkspaceId,
                    CreatedByUserId = OwnerId,
                    CodeHash = "other-code-hash",
                    CreatedAtUtc = createdAt,
                    ExpiresAtUtc = createdAt.AddDays(7),
                    RedeemedCount = 0,
                    MaxUses = 5
                }
            );

            await Db.SaveChangesAsync();
        }

        public void Dispose()
        {
            Db.Dispose();
        }
    }
}
