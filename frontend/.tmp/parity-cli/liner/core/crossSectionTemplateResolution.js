"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCrossSectionTemplateForPhysicalDistance = resolveCrossSectionTemplateForPhysicalDistance;
exports.resolveCrossSectionTemplateById = resolveCrossSectionTemplateById;
function sortByRange(left, right) {
    if (left.stationRange.startPhysicalDistance !== right.stationRange.startPhysicalDistance) {
        return left.stationRange.startPhysicalDistance - right.stationRange.startPhysicalDistance;
    }
    if (left.stationRange.endPhysicalDistance !== right.stationRange.endPhysicalDistance) {
        return left.stationRange.endPhysicalDistance - right.stationRange.endPhysicalDistance;
    }
    return left.id.localeCompare(right.id);
}
function sortByStation(left, right) {
    return (left.station ?? 0) - (right.station ?? 0);
}
function findTemplateById(templates, templateId) {
    if (!templateId) {
        return undefined;
    }
    return templates.find((template) => template.id === templateId);
}
function resolveCrossSectionTemplateForPhysicalDistance(input, physicalDistance) {
    const templates = input.crossSections ?? [];
    if (templates.length === 0) {
        return undefined;
    }
    const orderedDefinitions = (input.gridDefinitions ?? [])
        .filter((definition) => Number.isFinite(definition.stationRange.startPhysicalDistance)
        && Number.isFinite(definition.stationRange.endPhysicalDistance)
        && definition.stationRange.endPhysicalDistance >= definition.stationRange.startPhysicalDistance)
        .sort(sortByRange);
    for (let index = 0; index < orderedDefinitions.length; index += 1) {
        const definition = orderedDefinitions[index];
        const isLast = index === orderedDefinitions.length - 1;
        const afterStart = physicalDistance >= definition.stationRange.startPhysicalDistance;
        const beforeEnd = isLast
            ? physicalDistance <= definition.stationRange.endPhysicalDistance
            : physicalDistance < definition.stationRange.endPhysicalDistance;
        if (!afterStart || !beforeEnd) {
            continue;
        }
        const template = findTemplateById(templates, definition.crossSectionTemplateId);
        if (template) {
            return template;
        }
    }
    const stationTemplates = templates
        .filter((template) => Number.isFinite(template.station))
        .sort(sortByStation);
    if (stationTemplates.length > 0) {
        return stationTemplates.reduce((nearest, candidate) => {
            if (!nearest) {
                return candidate;
            }
            const nearestDistance = Math.abs((nearest.station ?? 0) - physicalDistance);
            const candidateDistance = Math.abs((candidate.station ?? 0) - physicalDistance);
            return candidateDistance < nearestDistance ? candidate : nearest;
        }, stationTemplates[0]);
    }
    return templates[0];
}
function resolveCrossSectionTemplateById(templates, templateId) {
    if (!templates || templates.length === 0) {
        return undefined;
    }
    return findTemplateById(templates, templateId) ?? templates[0];
}
