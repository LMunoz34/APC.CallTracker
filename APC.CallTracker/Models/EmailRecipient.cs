using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class EmailRecipient
    {
        public string BranchCode { get; set; }
        public string BranchName { get; set; }
        public string EmailAddress { get; set; }
    }
}
