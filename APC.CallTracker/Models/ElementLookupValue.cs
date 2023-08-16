using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APC.CallTracker.Models
{
    public class ElementLookupValue
    {
        public int ElementID { get; set; }
        public string Value { get; set; }
        public string Name { get; set; }
        public string Tag { get; set; }
        public int SortOrder { get; set; }
    }
}
