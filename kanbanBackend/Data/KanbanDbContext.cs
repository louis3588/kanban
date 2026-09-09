using Microsoft.EntityFrameworkCore;
using kanbanBackend.Models;

namespace kanbanBackend.Data;

public class KanbanDbContext : DbContext
{

    public KanbanDbContext(DbContextOptions<KanbanDbContext> options) : base(options)
    {
    }
    
    public DbSet<User> Users => Set<User>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<BoardColumn> BoardColumns => Set<BoardColumn>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Username)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(u => u.PasswordHash)
                .IsRequired();

            entity.HasIndex(u => u.Username)
                .IsUnique();

            entity.HasIndex(u => u.Email)
                .IsUnique();
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

            entity.Property(wm => wm.Role)
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
                .IsRequired()
                .HasMaxLength(20);

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