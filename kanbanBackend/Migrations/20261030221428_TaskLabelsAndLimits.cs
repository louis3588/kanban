using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace kanbanBackend.Migrations
{
    /// <inheritdoc />
    public partial class TaskLabelsAndLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Workspaces",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Progress",
                table: "TaskItems",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WorkInProgressLimit",
                table: "BoardColumns",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkspaceLabels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkspaceId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NormalisedName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Colour = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false, defaultValue: "#6B7280")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkspaceLabels", x => x.Id);
                    table.CheckConstraint("CK_WorkspaceLabels_Name", "length(trim(\"Name\")) > 0");
                    table.CheckConstraint("CK_WorkspaceLabels_NormalisedName", "length(trim(\"NormalisedName\")) > 0");
                    table.ForeignKey(
                        name: "FK_WorkspaceLabels_Workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "Workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaskItemLabels",
                columns: table => new
                {
                    TaskItemId = table.Column<int>(type: "integer", nullable: false),
                    WorkspaceLabelId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskItemLabels", x => new { x.TaskItemId, x.WorkspaceLabelId });
                    table.ForeignKey(
                        name: "FK_TaskItemLabels_TaskItems_TaskItemId",
                        column: x => x.TaskItemId,
                        principalTable: "TaskItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskItemLabels_WorkspaceLabels_WorkspaceLabelId",
                        column: x => x.WorkspaceLabelId,
                        principalTable: "WorkspaceLabels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_Progress",
                table: "TaskItems",
                sql: "\"Progress\" IS NULL OR (\"Progress\" >= 0 AND \"Progress\" <= 100)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BoardColumns_WorkInProgressLimit",
                table: "BoardColumns",
                sql: "\"WorkInProgressLimit\" IS NULL OR \"WorkInProgressLimit\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_TaskItemLabels_WorkspaceLabelId",
                table: "TaskItemLabels",
                column: "WorkspaceLabelId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkspaceLabels_WorkspaceId_NormalisedName",
                table: "WorkspaceLabels",
                columns: new[] { "WorkspaceId", "NormalisedName" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskItemLabels");

            migrationBuilder.DropTable(
                name: "WorkspaceLabels");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TaskItems_Progress",
                table: "TaskItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BoardColumns_WorkInProgressLimit",
                table: "BoardColumns");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Workspaces");

            migrationBuilder.DropColumn(
                name: "Progress",
                table: "TaskItems");

            migrationBuilder.DropColumn(
                name: "WorkInProgressLimit",
                table: "BoardColumns");
        }
    }
}
