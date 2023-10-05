using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace APC.CallTracker.Models
{
    [Table("ReasonCodeTemplate", Schema = "tracker")]
    public class NewReasonCodeTemplate
    {
        [Key]
        [Column(TypeName = "varchar(10)")]
        public string CodeID { get; set; }

        [Required]
        [Column(TypeName = "varchar(50)")]
        public string Name { get; set; }

        [Column(TypeName = "varchar(MAX)")]
        public string Summary { get; set; }

        [Column(TypeName = "varchar(MAX)")]
        public string? Description { get; set; }

        [Column(TypeName = "varchar(120)")]
        public string Caption { get; set; }

        [Required]
        [Column(TypeName = "varchar(2)")]
        public string LinkTypeID { get; set; }

        public bool Needs2067 { get; set; }

        [Column(TypeName = "nvarchar(MAX)")]
        public string Template { get; set; }

        public bool ForBillingTeam { get; set; }

        [DataType(DataType.Date)]
        public DateTime? EffectiveDate { get; set; }

        [DataType(DataType.Date)]
        public DateTime? ExpirationDate { get; set; }
    }
}
