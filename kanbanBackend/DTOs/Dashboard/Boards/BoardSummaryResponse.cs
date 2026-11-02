namespace kanbanBackend.DTOs.Dashboard;

public class BoardSummaryResponse
{
    public int BoardId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Position { get; set; }
}