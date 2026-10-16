namespace kanbanBackend.Services;

using System.Net;
using Microsoft.Extensions.Hosting;

public interface IEmailTemplateUtil
{
    Task<string> RenderAsync(
        string templateName,
        IReadOnlyDictionary<string, string> values);
}

public class EmailTemplateUtil : IEmailTemplateUtil
{
    private readonly string _templateDirectory;

    public EmailTemplateUtil(IHostEnvironment environment)
    {
        _templateDirectory = Path.Combine(
            environment.ContentRootPath,
            "EmailTemplates");
    }

    public async Task<string> RenderAsync(
        string templateName,
        IReadOnlyDictionary<string, string> values)
    {
        if (Path.GetFileName(templateName) != templateName)
        {
            throw new ArgumentException(
                "Invalid email template name.",
                nameof(templateName));
        }

        var filePath = Path.Combine(_templateDirectory, templateName);

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException(
                $"Email template '{templateName}' was not found.",
                filePath);
        }

        var html = await File.ReadAllTextAsync(filePath);

        foreach (var (key, value) in values)
        {
            html = html.Replace(
                $"{{{{{key}}}}}",
                WebUtility.HtmlEncode(value));
        }

        return html;
    }
}