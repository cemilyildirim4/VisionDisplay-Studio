namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Liste sayısı büyüdükçe (teklifler, sohbet kayıtları, projeler) admin panelinin
/// tamamını tek seferde çekmemesi için standart sayfalama zarfı.
/// </summary>
public class PagedResultDto<T>
{
    public IEnumerable<T> Items { get; set; } = Array.Empty<T>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

/// <summary>Sayfalama + serbest metin arama için ortak sorgu parametreleri.</summary>
public class PagedQueryDto
{
    private int _page = 1;
    private int _pageSize = 20;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value switch { < 1 => 1, > 200 => 200, _ => value };
    }

    public string? Search { get; set; }
}
