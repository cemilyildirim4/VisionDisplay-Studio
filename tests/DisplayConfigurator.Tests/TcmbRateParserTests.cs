using DisplayConfigurator.Application.Engine;

namespace DisplayConfigurator.Tests;

public class TcmbRateParserTests
{
    [Fact]
    public void UsdForexSelling_XmlIcindenOkur()
    {
        const string xml = """
            <Tarih_Date>
              <Currency Kod="USD" CurrencyCode="USD">
                <ForexBuying>34.10</ForexBuying>
                <ForexSelling>34.50</ForexSelling>
              </Currency>
            </Tarih_Date>
            """;

        Assert.Equal(34.50m, TcmbRateParser.UsdForexSelling(xml));
    }

    [Fact]
    public void UsdForexSelling_BozukXmlNull()
    {
        Assert.Null(TcmbRateParser.UsdForexSelling("<not-xml"));
        Assert.Null(TcmbRateParser.UsdForexSelling(null));
    }
}
