using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class AttendantContactInfo
    {
        public string Branch { get; set; }

        public string Name { get; set; }

        public string Number { get; set; }

        public string Language { get; set; }

        public bool UsesToken { get; set; }
    }
}
