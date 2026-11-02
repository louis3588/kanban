using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace kanbanBackend.Migrations
{
    /// <inheritdoc />
    public partial class SuccessCriteria : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Progress",
                table: "TaskItems");

            migrationBuilder.CreateTable(
                name: "SuccessCriteria",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TaskItemId = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Completed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Position = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuccessCriteria", x => x.Id);
                    table.CheckConstraint("CK_SuccessCriteria_Description", "length(trim(\"Description\")) > 0");
                    table.CheckConstraint("CK_SuccessCriteria_Position", "\"Position\" >= 0");
                    table.ForeignKey(
                        name: "FK_SuccessCriteria_TaskItems_TaskItemId",
                        column: x => x.TaskItemId,
                        principalTable: "TaskItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SuccessCriteria_TaskItemId_Position",
                table: "SuccessCriteria",
                columns: new[] { "TaskItemId", "Position" });
        }

        /// <inheritdoc />
        
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SuccessCriteria");

            migrationBuilder.AddColumn<decimal>(
                name: "Progress",
                table: "TaskItems",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);
            
            migrationBuilder.AddCheckConstraint(
                name: "CK_TaskItems_Progress",
                table: "TaskItems",
                sql: "\"Progress\" IS NULL OR (\"Progress\" >= 0 AND \"Progress\" <= 100)");
        }

    }
}
