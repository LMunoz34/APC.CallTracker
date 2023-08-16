using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class EmailInfo
    {
        public string Attendant { get; set; }
        public string Client { get; set; }
        public string Memo { get; set; }
        public string From { get; set; }
        public string Zip { get; set; }
        public List<string> Recipients { get; set; } = new List<string>();
    }
}
