using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Config
{
    public class GeneralConfiguration
    {
        public string SQL_ConnectionString { get; set; }
        public string SmtpHost { get; set; }
        public int SmtpPort { get; set; }
        public string SmtpUser { get; set; }
        public string SmtpPassword { get; set; }
        public string SecurityGroup_CallCenter { get; set; }
        public string SecurityGroup_Billing { get; set; }
        public List<string> SupervisorGroups { get; set; }
        public string SeqUrl { get; set; }
        public string SeqApiKey { get; set; }
    }
}
