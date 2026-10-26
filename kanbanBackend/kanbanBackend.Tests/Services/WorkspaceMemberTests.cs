using kanbanBackend.Data;
using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Dashboard;
using kanbanBackend.Services.Dashboard.Interfaces;

namespace kanbanBackend.Tests.Services;


using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;


public class WorkspaceMemberTests
{
    private const int WorkspaceId = 10;
    private const int OtherWorkspaceId = 20;

    private const int OwnerId = 1;
    private const int AdminId = 2;
    private const int MemberId = 3;
    private const int ViewerId = 4;
    private const int OutsiderId = 5;
    private const int CandidateId = 6;
    private const int OtherOwnerId = 7;
    
    [Fact]
    public async Task GetWorkspaceMembersAsync_WhenMember_ReturnsWorkspaceMembers()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(MemberId);

        var result = await fixture.Service
            .GetWorkspaceMembersAsync(WorkspaceId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(4, result.Value.Count);

        Assert.Contains(result.Value, m =>
            m.User.UserId == OwnerId &&
            m.Role == WorkspaceRole.Owner);

        Assert.Contains(result.Value, m =>
            m.User.UserId == AdminId &&
            m.Role == WorkspaceRole.Admin);

        Assert.Contains(result.Value, m =>
            m.User.UserId == MemberId &&
            m.Role == WorkspaceRole.Member);

        Assert.Contains(result.Value, m =>
            m.User.UserId == ViewerId &&
            m.Role == WorkspaceRole.Viewer);
    }

    [Fact]
    public async Task GetWorkspaceMembersAsync_WhenViewer_ReturnsMembers()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(ViewerId);

        var result = await fixture.Service
            .GetWorkspaceMembersAsync(WorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Equal(4, result.Value!.Count);
    }

    [Fact]
    public async Task GetWorkspaceMembersAsync_WhenNotMember_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OutsiderId);

        var result = await fixture.Service
            .GetWorkspaceMembersAsync(WorkspaceId);

        Assert.False(result.IsSuccess);
        Assert.Null(result.Value);
        Assert.NotNull(result.ErrorMessage);
    }

    [Fact]
    public async Task GetWorkspaceMembersAsync_ReturnsPeerProfileWithoutEmail()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service
            .GetWorkspaceMembersAsync(WorkspaceId);

        Assert.True(result.IsSuccess);

        var member = Assert.Single(
            result.Value!,
            m => m.User.UserId == MemberId);
        
        Assert.Equal("member", member.User.Username);
        Assert.Equal("John", member.User.FirstName);
        Assert.Equal("Smith", member.User.LastName);


        Assert.Null(
            typeof(PeerProfileResponse).GetProperty("Email"));
    }
    
    [Theory]
    [InlineData(WorkspaceRole.Member)]
    [InlineData(WorkspaceRole.Viewer)]
    public async Task AddWorkspaceMembersAsync_WhenAdminAddsOrdinaryRole_Succeeds(
        WorkspaceRole role)
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.AddWorkspaceMembersAsync(
            WorkspaceId, "candidate", role);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.NotNull(result.Value);
        Assert.Equal(CandidateId, result.Value.User.UserId);
        Assert.Equal(role, result.Value.Role);

        var saved = await fixture.Db.WorkspaceMembers
            .SingleAsync(m =>
                m.WorkspaceId == WorkspaceId &&
                m.UserId == CandidateId);

        Assert.Equal(role, saved.Role);
    }

    [Fact]
    public async Task AddWorkspaceMembersAsync_WhenOwnerAddsAdmin_Succeeds()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.AddWorkspaceMembersAsync(
            WorkspaceId, "candidate", WorkspaceRole.Admin);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Equal(WorkspaceRole.Admin, result.Value!.Role);
    }

    [Fact]
    public async Task AddWorkspaceMembersAsync_WhenAdminAddsAdmin_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.AddWorkspaceMembersAsync(
            WorkspaceId, "candidate", WorkspaceRole.Admin);

        Assert.False(result.IsSuccess);

        Assert.False(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == CandidateId));
    }

    [Fact]
    public async Task AddWorkspaceMembersAsync_WhenMemberAddsUser_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(MemberId);

        var result = await fixture.Service.AddWorkspaceMembersAsync(
            WorkspaceId, "candidate", WorkspaceRole.Member);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task AddWorkspaceMembersAsync_WhenUserAlreadyMember_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.AddWorkspaceMembersAsync(
            WorkspaceId, "member", WorkspaceRole.Member);

        Assert.False(result.IsSuccess);

        var count = await fixture.Db.WorkspaceMembers.CountAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == MemberId);

        Assert.Equal(1, count);
    }

    [Fact]
    public async Task AddWorkspaceMembersAsync_WhenUserDoesNotExist_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.AddWorkspaceMembersAsync(
            WorkspaceId, "unknownuser", WorkspaceRole.Member);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task AddWorkspaceMembersAsync_CannotAddSecondOwner()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.AddWorkspaceMembersAsync(
            WorkspaceId, "candidate", WorkspaceRole.Owner);

        Assert.False(result.IsSuccess);

        var owners = await fixture.Db.WorkspaceMembers
            .CountAsync(m =>
                m.WorkspaceId == WorkspaceId &&
                m.Role == WorkspaceRole.Owner);

        Assert.Equal(1, owners);
    }

    [Fact]
    public async Task UpdateWorkspaceMemberAsync_WhenOwnerPromotesMember_Succeeds()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.UpdateWorkspaceMemberAsync(
            WorkspaceId, MemberId, WorkspaceRole.Admin);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Equal(WorkspaceRole.Admin, result.Value!.Role);

        var membership = await fixture.Db.WorkspaceMembers.SingleAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == MemberId);

        Assert.Equal(WorkspaceRole.Admin, membership.Role);
    }

    [Fact]
    public async Task UpdateWorkspaceMemberAsync_WhenAdminPromotesViewerToMember_Succeeds()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.UpdateWorkspaceMemberAsync(
            WorkspaceId, ViewerId, WorkspaceRole.Member);

        Assert.True(result.IsSuccess);
        Assert.Equal(WorkspaceRole.Member, result.Value!.Role);
    }

    [Fact]
    public async Task UpdateWorkspaceMemberAsync_WhenAdminGrantsAdmin_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.UpdateWorkspaceMemberAsync(
            WorkspaceId, MemberId, WorkspaceRole.Admin);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateWorkspaceMemberAsync_WhenAdminChangesAnotherAdmin_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        
        fixture.Db.WorkspaceMembers.Add(new WorkspaceMember
        {
            UserId = CandidateId,
            WorkspaceId = WorkspaceId,
            Role = WorkspaceRole.Admin
        });

        await fixture.Db.SaveChangesAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.UpdateWorkspaceMemberAsync(
            WorkspaceId, CandidateId, WorkspaceRole.Member);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateWorkspaceMemberAsync_CannotDemoteOwner()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.UpdateWorkspaceMemberAsync(
            WorkspaceId, OwnerId, WorkspaceRole.Admin);

        Assert.False(result.IsSuccess);

        var owner = await fixture.Db.WorkspaceMembers.SingleAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == OwnerId);

        Assert.Equal(WorkspaceRole.Owner, owner.Role);
    }

    [Fact]
    public async Task UpdateWorkspaceMemberAsync_CannotAssignOwnerRole()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.UpdateWorkspaceMemberAsync(
            WorkspaceId, MemberId, WorkspaceRole.Owner);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task DeleteWorkspaceMemberAsync_WhenOwnerRemovesMember_Succeeds()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.DeleteWorkspaceMemberAsync(
            WorkspaceId, MemberId);

        Assert.True(result.IsSuccess);

        Assert.False(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == MemberId));
    }

    [Fact]
    public async Task DeleteWorkspaceMemberAsync_WhenAdminRemovesViewer_Succeeds()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.DeleteWorkspaceMemberAsync(
            WorkspaceId, ViewerId);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task DeleteWorkspaceMemberAsync_WhenAdminRemovesAdmin_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.DeleteWorkspaceMemberAsync(
            WorkspaceId, AdminId);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task DeleteWorkspaceMemberAsync_CannotRemoveOwner()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.DeleteWorkspaceMemberAsync(
            WorkspaceId, OwnerId);

        Assert.False(result.IsSuccess);

        Assert.True(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == OwnerId &&
            m.Role == WorkspaceRole.Owner));
    }

    [Fact]
    public async Task DeleteWorkspaceMemberAsync_ClearsOnlyThisWorkspaceAssignments()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        await fixture.SeedTasksAsync();

        var result = await fixture.Service.DeleteWorkspaceMemberAsync(
            WorkspaceId, MemberId);

        Assert.True(result.IsSuccess);
        
        var removedAssignment = await fixture.Db.TaskItems
            .AsNoTracking()
            .SingleAsync(t => t.Id == 100);

        Assert.Null(removedAssignment.AssignedUserId);
        Assert.NotNull(removedAssignment.UpdatedAt);
        
        var otherWorkspaceTask = await fixture.Db.TaskItems
            .AsNoTracking()
            .SingleAsync(t => t.Id == 101);

        Assert.Equal(MemberId, otherWorkspaceTask.AssignedUserId);
    }

    [Fact]
    public async Task DeleteWorkspaceMemberAsync_WhenOrdinaryMemberTries_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(MemberId);

        var result = await fixture.Service.DeleteWorkspaceMemberAsync(
            WorkspaceId, ViewerId);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task TransferWorkspaceOwnershipAsync_WhenOwnerTransfers_Succeeds()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.TransferWorkspaceOwnershipAsync(
            WorkspaceId, MemberId);

        Assert.True(result.IsSuccess);
        Assert.Equal(MemberId, result.Value!.User.UserId);
        Assert.Equal(WorkspaceRole.Owner, result.Value.Role);

        var memberships = await fixture.Db.WorkspaceMembers
            .AsNoTracking()
            .Where(m => m.WorkspaceId == WorkspaceId)
            .ToListAsync();

        Assert.Equal(
            1,
            memberships.Count(m => m.Role == WorkspaceRole.Owner));

        Assert.Equal(
            WorkspaceRole.Admin,
            memberships.Single(m => m.UserId == OwnerId).Role);

        Assert.Equal(
            WorkspaceRole.Owner,
            memberships.Single(m => m.UserId == MemberId).Role);
    }

    [Fact]
    public async Task TransferWorkspaceOwnershipAsync_WhenAdminTries_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.TransferWorkspaceOwnershipAsync(
            WorkspaceId, MemberId);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task TransferWorkspaceOwnershipAsync_WhenTargetIsNotMember_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.TransferWorkspaceOwnershipAsync(
            WorkspaceId, CandidateId);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task TransferWorkspaceOwnershipAsync_WhenOwnerSelectsSelf_ReturnsFailure()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.TransferWorkspaceOwnershipAsync(
            WorkspaceId, OwnerId);

        Assert.False(result.IsSuccess);
    }

    private sealed class TestFixture : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public KanbanDbContext Db { get; }
        public IWorkspaceMemberInterface Service { get; }

        private TestFixture(
            SqliteConnection connection,
            KanbanDbContext db)
        {
            _connection = connection;
            Db = db;

            _httpContextAccessor = new HttpContextAccessor();

            var currentUser = new CurrentUserService(_httpContextAccessor);
            var authService = new WorkspaceAuthService(Db);

            Service = new WorkspaceMemberService(
                Db,
                currentUser,
                authService);
        }

        public static async Task<TestFixture> CreateAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();

            var options = new DbContextOptionsBuilder<KanbanDbContext>()
                .UseSqlite(connection)
                .Options;

            var db = new KanbanDbContext(options);

            await db.Database.EnsureCreatedAsync();

            var users = new[]
            {
                CreateUser(OwnerId, "owner", "Olivia", "Smith"),
                CreateUser(AdminId, "admin", "Alex", "Smith"),
                CreateUser(MemberId, "member", "John", "Smith"),
                CreateUser(ViewerId, "viewer", "Victoria", "Smith"),
                CreateUser(OutsiderId, "outsider", "Oscar", "Smith"),
                CreateUser(CandidateId, "candidate", "Casey", "Smith"),
                CreateUser(OtherOwnerId, "otherowner", "Emma", "Smith")
            };

            db.Users.AddRange(users);

            db.Workspaces.AddRange(
                new Workspace
                {
                    Id = WorkspaceId,
                    Name = "Development",
                    CreatedAt = DateTime.UtcNow
                },
                new Workspace
                {
                    Id = OtherWorkspaceId,
                    Name = "Other Workspace",
                    CreatedAt = DateTime.UtcNow
                });

            db.WorkspaceMembers.AddRange(
                CreateMembership(OwnerId, WorkspaceId, WorkspaceRole.Owner),
                CreateMembership(AdminId, WorkspaceId, WorkspaceRole.Admin),
                CreateMembership(MemberId, WorkspaceId, WorkspaceRole.Member),
                CreateMembership(ViewerId, WorkspaceId, WorkspaceRole.Viewer),
                CreateMembership(OtherOwnerId, OtherWorkspaceId, WorkspaceRole.Owner),
                CreateMembership(MemberId, OtherWorkspaceId, WorkspaceRole.Member)
            );

            await db.SaveChangesAsync();

            var fixture = new TestFixture(connection, db);
            fixture.As(OwnerId);

            return fixture;
        }

        public void As(int userId)
        {
            var identity = new ClaimsIdentity(
                new[]
                {
                    new Claim(
                        JwtRegisteredClaimNames.Sub,
                        userId.ToString())
                },
                authenticationType: "Test");

            _httpContextAccessor.HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            };
        }

        public async Task SeedTasksAsync()
        {
            Db.Boards.AddRange(
                new Board
                {
                    Id = 1000,
                    WorkspaceId = WorkspaceId,
                    Name = "Development Board"
                },
                new Board
                {
                    Id = 1001,
                    WorkspaceId = OtherWorkspaceId,
                    Name = "Other Board"
                });

            Db.BoardColumns.AddRange(
                new BoardColumn
                {
                    Id = 2000,
                    BoardId = 1000,
                    Name = "To Do",
                    Position = 0
                },
                new BoardColumn
                {
                    Id = 2001,
                    BoardId = 1001,
                    Name = "To Do",
                    Position = 0
                });

            Db.TaskItems.AddRange(
                new TaskItem
                {
                    Id = 100,
                    Title = "Build API",
                    ColumnId = 2000,
                    AssignedUserId = MemberId,
                    Position = 0,
                    Priority = TaskPriority.Medium
                },
                new TaskItem
                {
                    Id = 101,
                    Title = "Write documentation",
                    ColumnId = 2001,
                    AssignedUserId = MemberId,
                    Position = 0,
                    Priority = TaskPriority.Low
                });

            await Db.SaveChangesAsync();
        }

        private static User CreateUser(
            int id,
            string username,
            string firstName,
            string lastName)
        {
            return new User
            {
                Id = id,
                Username = username,
                FirstName = firstName,
                LastName = lastName,
                Email = $"{username}@example.com",
                PasswordHash = "test-password-hash",
                IsEmailVerified = true
            };
        }

        private static WorkspaceMember CreateMembership(
            int userId,
            int workspaceId,
            WorkspaceRole role)
        {
            return new WorkspaceMember
            {
                UserId = userId,
                WorkspaceId = workspaceId,
                Role = role,
                JoinedAt = DateTime.UtcNow
            };
        }

        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }
}
