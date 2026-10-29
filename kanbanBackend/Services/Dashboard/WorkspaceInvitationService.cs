using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using kanbanBackend.Data;
using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Dashboard.Interfaces;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace kanbanBackend.Services.Dashboard;

public class WorkspaceInvitationService : IWorkspaceInvitationInterface
{
    private readonly KanbanDbContext _context;
    private readonly CurrentUserService _currentUser;
    private readonly WorkspaceAuthService _workspaceAuthService;

    public WorkspaceInvitationService(
        KanbanDbContext context, CurrentUserService currentUser, WorkspaceAuthService workspaceAuthService)
    {
        _context = context;
        _currentUser = currentUser;
        _workspaceAuthService = workspaceAuthService;
    }

    private static string GenerateCode()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashCode(string code)
    {
        var bytes = Encoding.UTF8.GetBytes(code);
        return Convert.ToHexString(SHA256.HashData(bytes));
    }

    public async Task<ModelResult<CreatedWorkspaceInvitation>> CreateWorkspaceInvitation(
        CreateInvitationRequest request)
    {
        var userId = _currentUser.UserId();
        var userNotFound = ModelResult<CreatedWorkspaceInvitation>
            .Failure("User could not be identified");
        if (userId is null)
        {
            return userNotFound;
        }
        
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value);
        
        if (user is null)
        {
            return  userNotFound;
        }

        var canInvite = await _workspaceAuthService.IsAdminAsync(userId.Value, request.WorkspaceId);
        if (!canInvite)
        {
            return ModelResult<CreatedWorkspaceInvitation>.Failure("Only admins can invite members");
        }

        if (request.ValidForDays is < 1 or > 30)
        {
            return ModelResult<CreatedWorkspaceInvitation>.Failure("Invitation validity must be between 1 and 30 days");
        }

        if (request.MaxUses is < 1 or > 1000)
        {
            return ModelResult<CreatedWorkspaceInvitation>.Failure("Maximum uses must be between 1 and 1000");
        }

        var frontendUrl = Environment.GetEnvironmentVariable("FRONTENDURL");

        if (!Uri.TryCreate(frontendUrl, UriKind.Absolute, out var baseUri) ||
            (baseUri.Scheme != Uri.UriSchemeHttps &&
             baseUri.Scheme != Uri.UriSchemeHttp))
        {
            return ModelResult<CreatedWorkspaceInvitation>
                .Failure("Frontend URL is not configured");
        }

        var code = GenerateCode();
        var now = DateTime.UtcNow;
        var expireTime = now.AddDays(request.ValidForDays);
        var hashcode = HashCode(code);

        var invitation = new WorkspaceInvitation
        {
            WorkspaceId = request.WorkspaceId,
            CreatedByUserId = userId.Value,
            CreatedByUser = user,
            CodeHash = hashcode,
            CreatedAtUtc = now,
            ExpiresAtUtc = expireTime,
            MaxUses = request.MaxUses,
            RedeemedCount = 0
        };

        _context.WorkspaceInvitations.Add(invitation);
        await _context.SaveChangesAsync();

        var inviteUrl = $"{frontendUrl!.TrimEnd('/')}/join/{code}";

        var response = new CreatedWorkspaceInvitation
        {
            Id = invitation.Id,
            WorkspaceId = invitation.WorkspaceId,
            CreatedByUserId = invitation.CreatedByUserId ?? invitation.CreatedByUser?.Id,
            CreatedAtUtc = invitation.CreatedAtUtc,
            ExpiresAtUtc = invitation.ExpiresAtUtc,
            RevokedAtUtc = invitation.RevokedAtUtc,
            RedeemedCount = invitation.RedeemedCount,
            MaxUses = invitation.MaxUses,
            Code = code,
            InviteUrl = inviteUrl
        };
        return ModelResult<CreatedWorkspaceInvitation>.Success(response);
    }

    public async Task<ModelResult<List<WorkspaceInvitationResponse>>> GetWorkspaceInvitations(int workspaceId)
    {
        var userId = _currentUser.UserId();
        if (userId is null)
        {
            return ModelResult<List<WorkspaceInvitationResponse>>.Failure("User could not be identified");
        }

        var isAdmin = await _workspaceAuthService.IsAdminAsync(userId.Value, workspaceId);
        if (!isAdmin)
        {
            return ModelResult<List<WorkspaceInvitationResponse>>
                .Failure("You do not have permission to view invitations");
        }

        var invitations = await _context.WorkspaceInvitations
            .AsNoTracking()
            .Where(i => i.WorkspaceId == workspaceId)
            .OrderByDescending(i => i.CreatedAtUtc)
            .Select(i => new WorkspaceInvitationResponse
            {
                Id = i.Id,
                WorkspaceId = i.WorkspaceId,
                CreatedByUserId = i.CreatedByUserId,
                CreatedAtUtc = i.CreatedAtUtc,
                ExpiresAtUtc = i.ExpiresAtUtc,
                RevokedAtUtc = i.RevokedAtUtc,
                RedeemedCount = i.RedeemedCount,
                MaxUses = i.MaxUses,
            }).ToListAsync();
        
        return ModelResult<List<WorkspaceInvitationResponse>>.Success(invitations);
    }

    public async Task<ModelResult<bool>> RevokeInvitation(int workspaceId, int invitationId)
    {
        var userId = _currentUser.UserId();
        if (userId is null)
        {
            return ModelResult<bool>.Failure("User could not be identified");
        }

        var isAdmin = await _workspaceAuthService.IsAdminAsync(userId.Value, workspaceId);
        if (!isAdmin)
        {
            return ModelResult<bool>.Failure("you do not have permission to revoke invitations");
        }
        
        var now = DateTime.UtcNow;
        var updated = await _context.WorkspaceInvitations
            .Where(i =>
                i.Id == invitationId &&
                i.WorkspaceId == workspaceId &&
                i.RevokedAtUtc == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(i => i.RevokedAtUtc, now));

        return updated == 0 ? ModelResult<bool>.Failure("Invitation was not found or already revoked") 
            : ModelResult<bool>.Success(true);
    }

    public async Task<ModelResult<WorkspaceResponse>> JoinWorkspace(string code)
    {
        var userId = _currentUser.UserId();
        var userNotFound = ModelResult<WorkspaceResponse>.Failure("You must be logged in to join a workspace");
        if (userId is null)
        {
            return userNotFound;
        }
        
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (user is null)
        {
            return userNotFound;
        }
        
        code = code?.Trim() ?? "";
        
        if (!Regex.IsMatch(code, @"\A[A-Za-z0-9_-]{43}\z", RegexOptions.CultureInvariant))
        {
            return ModelResult<WorkspaceResponse>.Failure("Invalid invitation code");
        }

        var codeHash = HashCode(code);
        var now = DateTime.UtcNow;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var invitation = await _context.WorkspaceInvitations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.CodeHash == codeHash);

        if (invitation is null || invitation.RevokedAtUtc != null || invitation.ExpiresAtUtc <= now ||
            (invitation.MaxUses.HasValue && invitation.RedeemedCount >= invitation.MaxUses))
        {
            return ModelResult<WorkspaceResponse>.Failure("Invitation is invalid or expired");
        }

        var existingMembership = await _context.WorkspaceMembers
            .AsNoTracking()
            .Where(m =>
                m.WorkspaceId == invitation.WorkspaceId &&
                m.UserId == userId.Value)
            .Select(m => new WorkspaceResponse
            {
                Id = m.WorkspaceId,
                Name = m.Workspace.Name,
                Role = m.Role,
                CreatedAt = m.Workspace.CreatedAt
            }).FirstOrDefaultAsync();

        if (existingMembership is not null)
        {
            return ModelResult<WorkspaceResponse>.Success(existingMembership);
        }

        var consumed = await _context.WorkspaceInvitations
            .Where(i =>
                i.Id == invitation.Id && i.RevokedAtUtc == null && i.ExpiresAtUtc > now &&
                (i.MaxUses == null || i.RedeemedCount < i.MaxUses))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(
                    i => i.RedeemedCount, i => i.RedeemedCount + 1));
        if (consumed != 1)
        {
            return ModelResult<WorkspaceResponse>.Failure("Invitation is no longer available");
        }

        var membership = new WorkspaceMember
        {
            WorkspaceId = invitation.WorkspaceId,
            UserId = userId.Value,
            User = user,
            Role = WorkspaceRole.Member,
            JoinedAt = now
        };

        _context.WorkspaceMembers.Add(membership);

        var response = await _context.Workspaces
            .AsNoTracking()
            .Where(w => w.Id == invitation.WorkspaceId)
            .Select(w => new WorkspaceResponse
            {
                Id = w.Id,
                Name = w.Name,
                CreatedAt = w.CreatedAt,
                Role = WorkspaceRole.Member,
            }).SingleAsync();

        try
        {
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException postgres && 
                                           postgres.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return ModelResult<WorkspaceResponse>.Failure("You are already a member of this workspace");
        }
        return ModelResult<WorkspaceResponse>.Success(response);
    }
}