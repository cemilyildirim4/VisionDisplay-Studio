using System.ComponentModel.DataAnnotations;
using DisplayConfigurator.Application.DTOs;
using Xunit;

namespace DisplayConfigurator.Tests;

public class PdfReportRequestDtoTests
{
    [Fact]
    public void Adres_ve_mesaj_bos_olabilir()
    {
        var dto = new PdfReportRequestDto
        {
            ProjectName = "Taslak",
            CabinId = 1,
            Cols = 2,
            Rows = 2,
            Address = null,
            Message = null,
        };

        var results = new List<ValidationResult>();
        var ok = Validator.TryValidateObject(dto, new ValidationContext(dto), results, validateAllProperties: true);

        Assert.True(ok, string.Join("; ", results.Select(r => r.ErrorMessage)));
    }
}
