namespace kanbanBackend.Util;

public class ModelResult<T>
{
    public bool IsSuccess { get; }
    public T Value { get; }
    public string? ErrorMessage { get; }

    private ModelResult(bool isSuccess, T value, string? errorMessage = null)
    {
        IsSuccess = isSuccess;
        Value = value;
        ErrorMessage = errorMessage;
    }
    
    public static ModelResult<T> Success(T value) => new(true, value, null);
    public static ModelResult<T> Failure(string errorMessage) => new(false, default, errorMessage);
}