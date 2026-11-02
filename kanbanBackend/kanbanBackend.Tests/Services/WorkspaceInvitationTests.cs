using kanbanBackend.Data;
using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Dashboard;
using kanbanBackend.Services.Dashboard.Interfaces;

namespace kanbanBackend.Tests.Services;


using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

[CollectionDefinition(
    "WorkspaceInvitationEnvironment",
    DisableParallelization = true)]
public class WorkspaceInvitationEnvironmentCollection
{
}

[Collection("WorkspaceInvitationEnvironment")]
public class WorkspaceInvitationTests
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

    private const string FrontendUrl = "https://kanban.example";


    [Fact]
    public async Task CreateWorkspaceInvitation_WhenOwner_Succeeds()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = WorkspaceId,
                ValidForDays = 7,
                MaxUses = 5
            });

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.NotNull(result.Value);

        var created = result.Value;

        Assert.Equal(WorkspaceId, created.WorkspaceId);
        Assert.Equal(OwnerId, created.CreatedByUserId);
        Assert.Equal(5, created.MaxUses);
        Assert.Equal(0, created.RedeemedCount);
        Assert.Null(created.RevokedAtUtc);

        Assert.InRange(
            (created.ExpiresAtUtc - created.CreatedAtUtc).TotalDays,
            6.999,
            7.001);

        Assert.Equal(43, created.Code.Length);
        Assert.Matches(@"^[A-Za-z0-9_-]{43}$", created.Code);

        Assert.Equal(
            $"{FrontendUrl}/join/{created.Code}",
            created.InviteUrl);

        var saved = await fixture.Db.WorkspaceInvitations
            .AsNoTracking()
            .SingleAsync(i => i.Id == created.Id);

        Assert.Equal(created.WorkspaceId, saved.WorkspaceId);
        Assert.Equal(created.CreatedByUserId, saved.CreatedByUserId);
        Assert.Equal(created.MaxUses, saved.MaxUses);
        Assert.Equal(0, saved.RedeemedCount);
    }

    [Fact]
    public async Task CreateWorkspaceInvitation_WhenAdmin_Succeeds()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(AdminId);

        var result = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = WorkspaceId,
                ValidForDays = 14,
                MaxUses = null
            });

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.NotNull(result.Value);
        Assert.Equal(AdminId, result.Value.CreatedByUserId);
        Assert.Null(result.Value.MaxUses);

        var saved = await fixture.Db.WorkspaceInvitations
            .AsNoTracking()
            .SingleAsync(i => i.Id == result.Value.Id);

        Assert.Equal(AdminId, saved.CreatedByUserId);
        Assert.Null(saved.MaxUses);
    }

    [Theory]
    [InlineData(MemberId)]
    [InlineData(ViewerId)]
    [InlineData(OutsiderId)]
    public async Task CreateWorkspaceInvitation_WhenNotAdmin_Fails(
        int userId)
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(userId);

        var result = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = WorkspaceId,
                ValidForDays = 7
            });

        Assert.False(result.IsSuccess);
        Assert.Contains("Only admins", result.ErrorMessage!);

        Assert.Empty(await fixture.Db.WorkspaceInvitations.ToListAsync());
    }

    [Fact]
    public async Task CreateWorkspaceInvitation_WhenNotAuthenticated_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(null);

        var result = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = WorkspaceId,
                ValidForDays = 7
            });

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "User could not be identified",
            result.ErrorMessage!);
    }

    [Fact]
    public async Task CreateWorkspaceInvitation_WhenUserDoesNotExist_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(9999);

        var result = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = WorkspaceId,
                ValidForDays = 7
            });

        Assert.False(result.IsSuccess);
        Assert.Empty(await fixture.Db.WorkspaceInvitations.ToListAsync());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(31)]
    public async Task CreateWorkspaceInvitation_WhenValidityInvalid_Fails(
        int validForDays)
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = WorkspaceId,
                ValidForDays = validForDays
            });

        Assert.False(result.IsSuccess);
        Assert.Contains("between 1 and 30", result.ErrorMessage!);

        Assert.Empty(await fixture.Db.WorkspaceInvitations.ToListAsync());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(1001)]
    public async Task CreateWorkspaceInvitation_WhenMaxUsesInvalid_Fails(
        int maxUses)
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = WorkspaceId,
                ValidForDays = 7,
                MaxUses = maxUses
            });

        Assert.False(result.IsSuccess);
        Assert.Contains("between 1 and 1000", result.ErrorMessage!);

        Assert.Empty(await fixture.Db.WorkspaceInvitations.ToListAsync());
    }

    [Fact]
    public async Task CreateWorkspaceInvitation_WhenFrontendUrlMissing_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        Environment.SetEnvironmentVariable("FRONTENDURL", null);

        var result = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = WorkspaceId,
                ValidForDays = 7
            });

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "Frontend URL is not configured",
            result.ErrorMessage!);

        Assert.Empty(await fixture.Db.WorkspaceInvitations.ToListAsync());
    }

    [Fact]
    public async Task CreateWorkspaceInvitation_StoresSha256HashNotPlaintext()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        var saved = await fixture.Db.WorkspaceInvitations
            .AsNoTracking()
            .SingleAsync(i => i.Id == created.Id);

        var expectedHash = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(created.Code)));

        Assert.Equal(expectedHash, saved.CodeHash);
        Assert.Equal(64, saved.CodeHash.Length);
        Assert.NotEqual(created.Code, saved.CodeHash);

        // In particular, the database must not contain
        // a reversible UTF-8-to-hex representation.
        var reversibleEncoding = Convert.ToHexString(
            Encoding.UTF8.GetBytes(created.Code));

        Assert.NotEqual(reversibleEncoding, saved.CodeHash);
    }

    [Fact]
    public async Task CreateWorkspaceInvitation_Twice_GeneratesDifferentCodes()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var first = await fixture.CreateInvitationAsync();
        var second = await fixture.CreateInvitationAsync();

        Assert.NotEqual(first.Code, second.Code);
        Assert.NotEqual(first.Id, second.Id);

        var hashes = await fixture.Db.WorkspaceInvitations
            .AsNoTracking()
            .Select(i => i.CodeHash)
            .ToListAsync();

        Assert.Equal(2, hashes.Count);
        Assert.Equal(2, hashes.Distinct().Count());
    }

    [Theory]
    [InlineData(OwnerId)]
    [InlineData(AdminId)]
    public async Task GetWorkspaceInvitations_WhenAdminOrOwner_Succeeds(
        int userId)
    {
        await using var fixture = await TestFixture.CreateAsync();

        var first = await fixture.CreateInvitationAsync(maxUses: 5);
        var second = await fixture.CreateInvitationAsync(maxUses: null);

        fixture.As(userId);

        var result = await fixture.Service.GetWorkspaceInvitations(
            WorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.NotNull(result.Value);
        Assert.Equal(2, result.Value.Count);

        Assert.Contains(result.Value, i => i.Id == first.Id);
        Assert.Contains(result.Value, i => i.Id == second.Id);

        Assert.All(result.Value, invitation =>
            Assert.Equal(WorkspaceId, invitation.WorkspaceId));
    }

    [Theory]
    [InlineData(MemberId)]
    [InlineData(ViewerId)]
    [InlineData(OutsiderId)]
    public async Task GetWorkspaceInvitations_WhenNotAdmin_Fails(
        int userId)
    {
        await using var fixture = await TestFixture.CreateAsync();
        await fixture.CreateInvitationAsync();

        fixture.As(userId);

        var result = await fixture.Service.GetWorkspaceInvitations(
            WorkspaceId);

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "permission to view invitations",
            result.ErrorMessage!);
    }

    [Fact]
    public async Task GetWorkspaceInvitations_WhenNoInvitations_ReturnsEmpty()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(OwnerId);

        var result = await fixture.Service.GetWorkspaceInvitations(
            WorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.NotNull(result.Value);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task GetWorkspaceInvitations_OnlyReturnsRequestedWorkspace()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var firstWorkspaceInvitation =
            await fixture.CreateInvitationAsync();

        fixture.As(OtherOwnerId);

        var otherResult = await fixture.Service.CreateWorkspaceInvitation(
            new CreateInvitationRequest
            {
                WorkspaceId = OtherWorkspaceId,
                ValidForDays = 7
            });

        Assert.True(otherResult.IsSuccess, otherResult.ErrorMessage);

        fixture.As(OwnerId);

        var result = await fixture.Service.GetWorkspaceInvitations(
            WorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Single(result.Value!);

        Assert.Equal(firstWorkspaceInvitation.Id, result.Value![0].Id);
        Assert.Equal(WorkspaceId, result.Value[0].WorkspaceId);
    }

    [Fact]
    public async Task GetWorkspaceInvitations_ReturnsNewestFirst()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var first = await fixture.CreateInvitationAsync();
        var second = await fixture.CreateInvitationAsync();

        var oldInvitation = await fixture.Db.WorkspaceInvitations
            .SingleAsync(i => i.Id == first.Id);

        oldInvitation.CreatedAtUtc = DateTime.UtcNow.AddDays(-2);
        await fixture.Db.SaveChangesAsync();

        fixture.As(OwnerId);

        var result = await fixture.Service.GetWorkspaceInvitations(
            WorkspaceId);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Equal(2, result.Value!.Count);

        Assert.Equal(second.Id, result.Value[0].Id);
        Assert.Equal(first.Id, result.Value[1].Id);
    }

    [Theory]
    [InlineData(OwnerId)]
    [InlineData(AdminId)]
    public async Task RevokeInvitation_WhenOwnerOrAdmin_Succeeds(
        int userId)
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(userId);

        var result = await fixture.Service.RevokeInvitation(
            WorkspaceId,
            created.Id);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.True(result.Value);

        var saved = await fixture.Db.WorkspaceInvitations
            .AsNoTracking()
            .SingleAsync(i => i.Id == created.Id);

        Assert.NotNull(saved.RevokedAtUtc);
        Assert.True(saved.RevokedAtUtc <= DateTime.UtcNow);
    }

    [Theory]
    [InlineData(MemberId)]
    [InlineData(ViewerId)]
    [InlineData(OutsiderId)]
    public async Task RevokeInvitation_WhenNotAdmin_Fails(
        int userId)
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(userId);

        var result = await fixture.Service.RevokeInvitation(
            WorkspaceId,
            created.Id);

        Assert.False(result.IsSuccess);

        var saved = await fixture.Db.WorkspaceInvitations
            .AsNoTracking()
            .SingleAsync(i => i.Id == created.Id);

        Assert.Null(saved.RevokedAtUtc);
    }

    [Fact]
    public async Task RevokeInvitation_WhenAlreadyRevoked_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(OwnerId);

        var first = await fixture.Service.RevokeInvitation(
            WorkspaceId,
            created.Id);

        var second = await fixture.Service.RevokeInvitation(
            WorkspaceId,
            created.Id);

        Assert.True(first.IsSuccess, first.ErrorMessage);
        Assert.False(second.IsSuccess);

        Assert.Contains(
            "already revoked",
            second.ErrorMessage!);
    }

    [Fact]
    public async Task RevokeInvitation_WhenWrongWorkspace_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(OtherOwnerId);

        var result = await fixture.Service.RevokeInvitation(
            OtherWorkspaceId,
            created.Id);

        Assert.False(result.IsSuccess);

        var saved = await fixture.Db.WorkspaceInvitations
            .AsNoTracking()
            .SingleAsync(i => i.Id == created.Id);

        Assert.Null(saved.RevokedAtUtc);
    }


    [Fact]
    public async Task JoinWorkspace_WithValidCode_CreatesMember()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync(maxUses: 5);

        fixture.As(CandidateId);

        var result = await fixture.Service.JoinWorkspace(created.Code);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.NotNull(result.Value);

        Assert.Equal(WorkspaceId, result.Value.Id);
        Assert.Equal("Development Team", result.Value.Name);
        Assert.Equal(WorkspaceRole.Member, result.Value.Role);

        var membership = await fixture.Db.WorkspaceMembers
            .AsNoTracking()
            .SingleAsync(m =>
                m.WorkspaceId == WorkspaceId &&
                m.UserId == CandidateId);

        Assert.Equal(WorkspaceRole.Member, membership.Role);

        var invitation = await fixture.Db.WorkspaceInvitations
            .AsNoTracking()
            .SingleAsync(i => i.Id == created.Id);

        Assert.Equal(1, invitation.RedeemedCount);
    }

    [Fact]
    public async Task JoinWorkspace_WhenNotAuthenticated_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(null);

        var result = await fixture.Service.JoinWorkspace(created.Code);

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "must be logged in",
            result.ErrorMessage!);

        await fixture.AssertRedeemedCountAsync(created.Id, 0);
    }

    [Fact]
    public async Task JoinWorkspace_WhenUserDoesNotExist_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(9999);

        var result = await fixture.Service.JoinWorkspace(created.Code);

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "must be logged in",
            result.ErrorMessage!);

        await fixture.AssertRedeemedCountAsync(created.Id, 0);
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid")]
    [InlineData("123456")]
    [InlineData("https://kanban.example/join/123456")]
    public async Task JoinWorkspace_WithMalformedCode_Fails(
        string code)
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(CandidateId);

        var result = await fixture.Service.JoinWorkspace(code);

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "Invalid invitation code",
            result.ErrorMessage!);

        Assert.False(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.UserId == CandidateId &&
            m.WorkspaceId == WorkspaceId));
    }

    [Fact]
    public async Task JoinWorkspace_WithUnknownValidFormatCode_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();
        fixture.As(CandidateId);

        var unknownCode = new string('A', 43);

        var result = await fixture.Service.JoinWorkspace(unknownCode);

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "Invitation is invalid or expired",
            result.ErrorMessage!);
    }

    [Fact]
    public async Task JoinWorkspace_WithExpiredInvitation_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        var invitation = await fixture.Db.WorkspaceInvitations
            .SingleAsync(i => i.Id == created.Id);

        invitation.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
        await fixture.Db.SaveChangesAsync();

        fixture.As(CandidateId);

        var result = await fixture.Service.JoinWorkspace(created.Code);

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "Invitation is invalid or expired",
            result.ErrorMessage!);

        Assert.False(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == CandidateId));

        await fixture.AssertRedeemedCountAsync(created.Id, 0);
    }

    [Fact]
    public async Task JoinWorkspace_WithRevokedInvitation_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(OwnerId);

        var revoke = await fixture.Service.RevokeInvitation(
            WorkspaceId,
            created.Id);

        Assert.True(revoke.IsSuccess, revoke.ErrorMessage);

        fixture.As(CandidateId);

        var result = await fixture.Service.JoinWorkspace(created.Code);

        Assert.False(result.IsSuccess);
        Assert.Contains(
            "Invitation is invalid or expired",
            result.ErrorMessage!);

        Assert.False(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == CandidateId));

        await fixture.AssertRedeemedCountAsync(created.Id, 0);
    }

    [Fact]
    public async Task JoinWorkspace_WhenMaxUsesReached_Fails()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync(maxUses: 1);

        fixture.As(CandidateId);

        var first = await fixture.Service.JoinWorkspace(created.Code);

        Assert.True(first.IsSuccess, first.ErrorMessage);

        fixture.As(OutsiderId);

        var second = await fixture.Service.JoinWorkspace(created.Code);

        Assert.False(second.IsSuccess);
        Assert.Contains(
            "Invitation is invalid or expired",
            second.ErrorMessage!);

        Assert.False(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == OutsiderId));

        await fixture.AssertRedeemedCountAsync(created.Id, 1);
    }

    [Fact]
    public async Task JoinWorkspace_ExistingMember_DoesNotDuplicateOrConsume()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync(maxUses: 5);

        fixture.As(MemberId);

        var result = await fixture.Service.JoinWorkspace(created.Code);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Equal(WorkspaceRole.Member, result.Value!.Role);

        var memberships = await fixture.Db.WorkspaceMembers
            .AsNoTracking()
            .Where(m =>
                m.WorkspaceId == WorkspaceId &&
                m.UserId == MemberId)
            .ToListAsync();

        Assert.Single(memberships);

        await fixture.AssertRedeemedCountAsync(created.Id, 0);
    }

    [Fact]
    public async Task JoinWorkspace_ExistingAdmin_KeepsExistingRole()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(AdminId);

        var result = await fixture.Service.JoinWorkspace(created.Code);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Equal(WorkspaceRole.Admin, result.Value!.Role);

        var membership = await fixture.Db.WorkspaceMembers
            .AsNoTracking()
            .SingleAsync(m =>
                m.WorkspaceId == WorkspaceId &&
                m.UserId == AdminId);

        Assert.Equal(WorkspaceRole.Admin, membership.Role);

        await fixture.AssertRedeemedCountAsync(created.Id, 0);
    }

    [Fact]
    public async Task JoinWorkspace_TwiceBySameUser_DoesNotConsumeAgain()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync(maxUses: 3);

        fixture.As(CandidateId);

        var first = await fixture.Service.JoinWorkspace(created.Code);
        var second = await fixture.Service.JoinWorkspace(created.Code);

        Assert.True(first.IsSuccess, first.ErrorMessage);
        Assert.True(second.IsSuccess, second.ErrorMessage);

        var memberships = await fixture.Db.WorkspaceMembers
            .AsNoTracking()
            .Where(m =>
                m.WorkspaceId == WorkspaceId &&
                m.UserId == CandidateId)
            .ToListAsync();

        Assert.Single(memberships);

        await fixture.AssertRedeemedCountAsync(created.Id, 1);
    }

    [Fact]
    public async Task JoinWorkspace_UnlimitedInvitation_AllowsMultipleUsers()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync(maxUses: null);

        fixture.As(CandidateId);
        var first = await fixture.Service.JoinWorkspace(created.Code);

        fixture.As(OutsiderId);
        var second = await fixture.Service.JoinWorkspace(created.Code);

        Assert.True(first.IsSuccess, first.ErrorMessage);
        Assert.True(second.IsSuccess, second.ErrorMessage);

        Assert.True(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == CandidateId));

        Assert.True(await fixture.Db.WorkspaceMembers.AnyAsync(m =>
            m.WorkspaceId == WorkspaceId &&
            m.UserId == OutsiderId));

        await fixture.AssertRedeemedCountAsync(created.Id, 2);
    }

    [Fact]
    public async Task JoinWorkspace_AcceptsCodeWithSurroundingWhitespace()
    {
        await using var fixture = await TestFixture.CreateAsync();

        var created = await fixture.CreateInvitationAsync();

        fixture.As(CandidateId);

        var result = await fixture.Service.JoinWorkspace(
            $"  {created.Code}  ");

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Equal(WorkspaceRole.Member, result.Value!.Role);
    }

    private sealed class TestFixture : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly HttpContextAccessor _httpContextAccessor;
        private readonly string? _originalFrontendUrl;

        public KanbanDbContext Db { get; }

        public IWorkspaceInvitationInterface Service { get; }

        private TestFixture(
            SqliteConnection connection,
            KanbanDbContext db,
            HttpContextAccessor httpContextAccessor,
            IWorkspaceInvitationInterface service,
            string? originalFrontendUrl)
        {
            _connection = connection;
            Db = db;
            _httpContextAccessor = httpContextAccessor;
            Service = service;
            _originalFrontendUrl = originalFrontendUrl;
        }

        public static async Task<TestFixture> CreateAsync()
        {
            var originalFrontendUrl =
                Environment.GetEnvironmentVariable("FRONTENDURL");

            Environment.SetEnvironmentVariable(
                "FRONTENDURL",
                FrontendUrl);

            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();

            var options = new DbContextOptionsBuilder<KanbanDbContext>()
                .UseSqlite(connection)
                .Options;

            var db = new KanbanDbContext(options);

            await db.Database.EnsureCreatedAsync();

            db.Users.AddRange(
                NewUser(OwnerId, "owner", "John"),
                NewUser(AdminId, "admin", "Alex"),
                NewUser(MemberId, "member", "Casey"),
                NewUser(ViewerId, "viewer", "Taylor"),
                NewUser(OutsiderId, "outsider", "Jordan"),
                NewUser(CandidateId, "candidate", "Morgan"),
                NewUser(OtherOwnerId, "otherowner", "Jamie")
            );

            db.Workspaces.AddRange(
                new Workspace
                {
                    Id = WorkspaceId,
                    Name = "Development Team",
                    CreatedAt = DateTime.UtcNow
                },
                new Workspace
                {
                    Id = OtherWorkspaceId,
                    Name = "Another Workspace",
                    CreatedAt = DateTime.UtcNow
                }
            );

            db.WorkspaceMembers.AddRange(
                NewMember(OwnerId, WorkspaceId, WorkspaceRole.Owner),
                NewMember(AdminId, WorkspaceId, WorkspaceRole.Admin),
                NewMember(MemberId, WorkspaceId, WorkspaceRole.Member),
                NewMember(ViewerId, WorkspaceId, WorkspaceRole.Viewer),
                NewMember(
                    OtherOwnerId,
                    OtherWorkspaceId,
                    WorkspaceRole.Owner)
            );

            await db.SaveChangesAsync();

            var httpContextAccessor = new HttpContextAccessor();
            var currentUser = new CurrentUserService(httpContextAccessor);
            var workspaceAuth = new WorkspaceAuthService(db);

            IWorkspaceInvitationInterface service =
                new WorkspaceInvitationService(
                    db,
                    currentUser,
                    workspaceAuth);

            var fixture = new TestFixture(
                connection,
                db,
                httpContextAccessor,
                service,
                originalFrontendUrl);

            fixture.As(OwnerId);

            return fixture;
        }

        public void As(int? userId)
        {
            var claims = new List<Claim>();

            if (userId.HasValue)
            {
                claims.Add(new Claim(
                    JwtRegisteredClaimNames.Sub,
                    userId.Value.ToString()));

                claims.Add(new Claim(
                    ClaimTypes.NameIdentifier,
                    userId.Value.ToString()));
            }

            _httpContextAccessor.HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(
                    new ClaimsIdentity(claims, "TestAuthentication"))
            };
        }

        public async Task<CreatedWorkspaceInvitation> CreateInvitationAsync(
            int validForDays = 7,
            int? maxUses = null)
        {
            As(OwnerId);

            var result = await Service.CreateWorkspaceInvitation(
                new CreateInvitationRequest
                {
                    WorkspaceId = WorkspaceId,
                    ValidForDays = validForDays,
                    MaxUses = maxUses
                });

            Assert.True(result.IsSuccess, result.ErrorMessage);
            Assert.NotNull(result.Value);

            return result.Value;
        }

        public async Task AssertRedeemedCountAsync(
            int invitationId,
            int expected)
        {
            var actual = await Db.WorkspaceInvitations
                .AsNoTracking()
                .Where(i => i.Id == invitationId)
                .Select(i => i.RedeemedCount)
                .SingleAsync();

            Assert.Equal(expected, actual);
        }

        private static User NewUser(
            int id,
            string username,
            string firstName)
        {
            return new User
            {
                Id = id,
                Username = username,
                FirstName = firstName,
                LastName = "Smith",
                Email = $"{username}@example.test",
                PasswordHash = "test-password-hash",
                IsEmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };
        }

        private static WorkspaceMember NewMember(
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
            _httpContextAccessor.HttpContext = null;

            Environment.SetEnvironmentVariable(
                "FRONTENDURL",
                _originalFrontendUrl);

            await Db.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }
}
