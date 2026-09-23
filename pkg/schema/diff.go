package schema

import "fmt"

// DiffType indicates the backward compatibility severity of a schema change.
type DiffType string

const (
	DiffBreaking DiffType = "BREAKING"
	DiffAddition DiffType = "ADDITION"
	DiffModified DiffType = "MODIFIED"
)

// DiffItem represents a single identified difference between two schemas.
type DiffItem struct {
	Type        DiffType `json:"type"`
	Category    string   `json:"category"` // "Service", "Method", "Field"
	Location    string   `json:"location"`
	Description string   `json:"description"`
}

// SchemaDiffReport contains all detected differences and breaking change flags.
type SchemaDiffReport struct {
	HasBreakingChanges bool       `json:"hasBreakingChanges"`
	TotalBreaking      int        `json:"totalBreaking"`
	TotalAdditions     int        `json:"totalAdditions"`
	TotalModified      int        `json:"totalModified"`
	Diffs              []DiffItem `json:"diffs"`
}

// CompareRegistries detects backward compatibility breaking changes and additions between two registries.
func CompareRegistries(base *SchemaRegistry, target *SchemaRegistry) *SchemaDiffReport {
	report := &SchemaDiffReport{
		Diffs: make([]DiffItem, 0),
	}

	if base == nil || target == nil {
		return report
	}

	baseSvcMap := make(map[string]ServiceInfo)
	for _, s := range base.Services {
		baseSvcMap[s.FullName] = s
	}

	targetSvcMap := make(map[string]ServiceInfo)
	for _, s := range target.Services {
		targetSvcMap[s.FullName] = s
	}

	// 1. Check for removed services (BREAKING)
	for sName, baseSvc := range baseSvcMap {
		targetSvc, exists := targetSvcMap[sName]
		if !exists {
			report.add(DiffBreaking, "Service", sName, fmt.Sprintf("Service %s was removed", sName))
			continue
		}

		// Compare methods within service
		compareMethods(baseSvc, targetSvc, report)
	}

	// 2. Check for added services (ADDITION)
	for sName := range targetSvcMap {
		if _, exists := baseSvcMap[sName]; !exists {
			report.add(DiffAddition, "Service", sName, fmt.Sprintf("Service %s was newly added", sName))
		}
	}

	return report
}

func compareMethods(baseSvc ServiceInfo, targetSvc ServiceInfo, report *SchemaDiffReport) {
	baseMethodMap := make(map[string]MethodInfo)
	for _, m := range baseSvc.Methods {
		baseMethodMap[m.Name] = m
	}

	targetMethodMap := make(map[string]MethodInfo)
	for _, m := range targetSvc.Methods {
		targetMethodMap[m.Name] = m
	}

	// Check removed methods
	for mName, baseM := range baseMethodMap {
		targetM, exists := targetMethodMap[mName]
		if !exists {
			report.add(DiffBreaking, "Method", fmt.Sprintf("%s.%s", baseSvc.Name, mName), fmt.Sprintf("Method %s was removed", mName))
			continue
		}

		// Check signature changes
		if baseM.Input.FullName != targetM.Input.FullName {
			report.add(DiffBreaking, "Method", fmt.Sprintf("%s.%s", baseSvc.Name, mName),
				fmt.Sprintf("Input message changed from %s to %s", baseM.Input.FullName, targetM.Input.FullName))
		}
		if baseM.Output.FullName != targetM.Output.FullName {
			report.add(DiffBreaking, "Method", fmt.Sprintf("%s.%s", baseSvc.Name, mName),
				fmt.Sprintf("Output message changed from %s to %s", baseM.Output.FullName, targetM.Output.FullName))
		}
		if baseM.Kind != targetM.Kind {
			report.add(DiffBreaking, "Method", fmt.Sprintf("%s.%s", baseSvc.Name, mName),
				fmt.Sprintf("Streaming mode changed from %s to %s", baseM.Kind, targetM.Kind))
		}

		// Compare input message fields
		compareFields(baseM.Input, targetM.Input, report)
	}

	// Check added methods
	for mName := range targetMethodMap {
		if _, exists := baseMethodMap[mName]; !exists {
			report.add(DiffAddition, "Method", fmt.Sprintf("%s.%s", baseSvc.Name, mName), fmt.Sprintf("Method %s was newly added", mName))
		}
	}
}

func compareFields(baseMsg MessageInfo, targetMsg MessageInfo, report *SchemaDiffReport) {
	baseFields := make(map[string]FieldInfo)
	for _, f := range baseMsg.Fields {
		baseFields[f.Name] = f
	}

	targetFields := make(map[string]FieldInfo)
	for _, f := range targetMsg.Fields {
		targetFields[f.Name] = f
	}

	// Check removed fields or changed numbers/types
	for fName, bF := range baseFields {
		tF, exists := targetFields[fName]
		if !exists {
			report.add(DiffBreaking, "Field", fmt.Sprintf("%s.%s", baseMsg.Name, fName),
				fmt.Sprintf("Field %s (tag #%d) was deleted from %s", fName, bF.Number, baseMsg.Name))
			continue
		}

		if bF.Number != tF.Number {
			report.add(DiffBreaking, "Field", fmt.Sprintf("%s.%s", baseMsg.Name, fName),
				fmt.Sprintf("Field %s tag number changed from #%d to #%d", fName, bF.Number, tF.Number))
		}

		if bF.Type != tF.Type || bF.MessageType != tF.MessageType {
			report.add(DiffBreaking, "Field", fmt.Sprintf("%s.%s", baseMsg.Name, fName),
				fmt.Sprintf("Field %s type changed from %s to %s", fName, bF.Type, tF.Type))
		}

		if bF.IsRepeated != tF.IsRepeated {
			report.add(DiffBreaking, "Field", fmt.Sprintf("%s.%s", baseMsg.Name, fName),
				fmt.Sprintf("Field %s cardinality altered (repeated changed)", fName))
		}
	}

	// Check newly added fields
	for fName, tF := range targetFields {
		if _, exists := baseFields[fName]; !exists {
			report.add(DiffAddition, "Field", fmt.Sprintf("%s.%s", targetMsg.Name, fName),
				fmt.Sprintf("New optional field %s (#%d, %s) added", fName, tF.Number, tF.Type))
		}
	}
}

func (r *SchemaDiffReport) add(t DiffType, cat string, loc string, desc string) {
	r.Diffs = append(r.Diffs, DiffItem{
		Type:        t,
		Category:    cat,
		Location:    loc,
		Description: desc,
	})

	switch t {
	case DiffBreaking:
		r.HasBreakingChanges = true
		r.TotalBreaking++
	case DiffAddition:
		r.TotalAdditions++
	case DiffModified:
		r.TotalModified++
	}
}
