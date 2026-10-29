using Microsoft.EntityFrameworkCore;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;

namespace kanbanBackend.Data;

public class KanbanDbContext : DbContext
{

    public KanbanDbContext(DbContextOptions<KanbanDbContext> options) : base(options)
    {
    }
    
    public DbSet<User> Users => Set<User>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<ExternalLogin> ExternalLogins => Set<ExternalLogin>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<BoardColumn> BoardColumns => Set<BoardColumn>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<WorkspaceInvitation> WorkspaceInvitations => Set<WorkspaceInvitation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Username)
                .IsRequired()
                .HasMaxLength(49);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(u => u.PasswordHash)
                .IsRequired();

            entity.Property(u => u.FirstName)
                .IsRequired();

            entity.Property(u => u.LastName);

            entity.Property(u => u.ProfileImage);

            entity.Property(u => u.Bio)
                .HasMaxLength(500);
            
            entity.Property(u => u.IsEmailVerified)
                .IsRequired()
                .HasDefaultValue(false);

            entity.HasOne(u => u.Settings)
                .WithOne(us => us.User)
                .HasForeignKey<UserSettings>(us => us.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                

            entity.Property(u => u.EmailConfirmationTokenHash)
                .HasMaxLength(64);

            entity.HasIndex(u => u.Username)
                .IsUnique();

            entity.HasIndex(u => u.Email)
                .IsUnique();
        });

        // User settings
        modelBuilder.Entity<UserSettings>(entity =>
        {
            entity.HasKey(us => us.Id);
            entity.HasIndex(us => us.UserId)
                .IsUnique();

            entity.Property(us => us.Theme)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(AppTheme.SepiaLight);
        });

        modelBuilder.Entity<WorkspaceInvitation>(entity =>
        {
            entity.HasKey(wi => wi.Id);

            entity.Property(wi => wi.CodeHash)
                .IsRequired()
                .HasMaxLength(64);

            entity.HasIndex(wi => wi.CodeHash)
                .IsUnique();
            entity.HasIndex(wi => wi.WorkspaceId);

            entity.Property(wi => wi.RedeemedCount)
                .HasDefaultValue(0);

            entity.HasOne(wi => wi.Workspace)
                .WithMany(w => w.Invitations)
                .HasForeignKey(wi => wi.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(wi => wi.CreatedByUser)
                .WithMany()
                .HasForeignKey(wi => wi.CreatedByUserId)
                .OnDelete(DeleteBehavior.Cascade);

        });
        
        // Workspace
        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.HasKey(w => w.Id);
            entity.Property(w => w.Name)
                .IsRequired()
                .HasMaxLength(150);
        });
        
        //Workspace member
        modelBuilder.Entity<WorkspaceMember>(entity =>
        {
            entity.HasKey(wm => new
            {
                wm.UserId,
                wm.WorkspaceId
            });
            
            entity.HasIndex(wm => wm.WorkspaceId)
                .HasDatabaseName("IX_WorkspaceMembers_WorkspaceId");
            
            entity.HasIndex(
                    wm => wm.WorkspaceId,
                    "IX_WorkspaceMembers_SingleOwner")
                .IsUnique()
                .HasFilter("\"Role\" = 'Owner'");

            entity.Property(wm => wm.Role)
                .HasConversion<string>()
                .IsRequired()
                .HasMaxLength(20);
            
            entity.HasOne(wm => wm.User)
                .WithMany(u => u.WorkspaceMemberships)
                .HasForeignKey(wm => wm.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(wm => wm.Workspace)
                .WithMany(w => w.Members)
                .HasForeignKey(wm => wm.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);
            
        });
        
        //Board
        modelBuilder.Entity<Board>(entity =>
        {
            entity.HasKey(b => b.Id);

            entity.Property(b => b.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.HasOne(b => b.Workspace)
                .WithMany(w => w.Boards)
                .HasForeignKey(b => b.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        //External Login
        modelBuilder.Entity<ExternalLogin>()
            .HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExternalLogin>()
            .HasIndex(e => new { e.Provider, e.ProviderUserId })
            .IsUnique();
        
        //Board Column
        modelBuilder.Entity<BoardColumn>(entity =>
        {
            entity.HasKey(bc => bc.Id);

            entity.Property(bc => bc.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.HasOne(bc => bc.Board)
                .WithMany(b => b.Columns)
                .HasForeignKey(c => c.BoardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(bc => new
            {
                bc.BoardId,
                bc.Position
            });
        });
        
        //Task Item
        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(t => t.Description)
                .HasMaxLength(5000);

            entity.Property(t => t.Priority)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(TaskPriority.Medium)
                .HasSentinel(TaskPriority.Medium);

            entity.HasOne(t => t.Column)
                .WithMany(t => t.Tasks)
                .HasForeignKey(t => t.ColumnId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(t => t.AssignedUser)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(t => t.AssignedUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(t => new
            {
                t.ColumnId,
                t.Position
            });
        });
    }
}