using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kanbanBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Priority",
                table: "TaskItems",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Medium",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.CreateIndex(
                name: "IX_WorkspaceMembers_SingleOwner",
                table: "WorkspaceMembers",
                column: "WorkspaceId",
                unique: true,
                filter: "\"Role\" = 'Owner'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkspaceMembers_SingleOwner",
                table: "WorkspaceMembers");

            migrationBuilder.AlterColumn<string>(
                name: "Priority",
                table: "TaskItems",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Medium");
        }
    }
}
