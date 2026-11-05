using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kanbanBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardPositionAndImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.DropIndex(
                name: "IX_Boards_WorkspaceId",
                table: "Boards");

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Boards",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Position",
                table: "Boards",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Boards_WorkspaceId_Position",
                table: "Boards",
                columns: new[] { "WorkspaceId", "Position" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Boards_Position",
                table: "Boards",
                sql: "\"Position\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Boards_WorkspaceId_Position",
                table: "Boards");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Boards_Position",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "Position",
                table: "Boards");
            
            migrationBuilder.CreateIndex(
                name: "IX_Boards_WorkspaceId",
                table: "Boards",
                column: "WorkspaceId");
        }
    }
}
