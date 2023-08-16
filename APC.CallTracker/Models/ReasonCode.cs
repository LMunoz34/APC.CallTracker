using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class ReasonCode
    {
        public string CodeID { get; set; }
        public string Name { get; set; }
        public string Summary { get; set; }
        public string Description { get; set; }
        public string Caption { get; set; }
        public string LinkTypeID { get; set; }
        public bool Needs2067 { get; set; }
        public string Template { get; set; }
        public bool ForBillingTeam { get; set; }
    }
}
