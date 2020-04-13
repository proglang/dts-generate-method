import { ResultComparison } from "../Comparator";
import Formatter from "./Formatter";
import ParameterTypeNonEmptyIntersectionDifference from "../difference/ParameterTypeNonEmptyIntersectionDifference";
import ParameterTypeEmptyIntersectionDifference from "../difference/ParameterTypeEmptyIntersectionDifference";
import ParameterExtraDifference from "../difference/ParameterExtraDifference";
import ParameterMissingDifference from "../difference/ParameterMissingDifference";
import TemplateDifference from "../difference/TemplateDifference";

export default class CSVFormatter implements Formatter {
	format(comparedModule: string, r: ResultComparison) : string {
		let line : string[] = [];

		const differencesInCsv : { [k: string] : number } = {};
		differencesInCsv[TemplateDifference.CODE] =  0;
		differencesInCsv[ParameterTypeNonEmptyIntersectionDifference.CODE] =  0;
		differencesInCsv[ParameterTypeEmptyIntersectionDifference.CODE] =  0;
		differencesInCsv[ParameterExtraDifference.CODE] =  0;
		differencesInCsv[ParameterMissingDifference.CODE] = 0;
		
		r.differences.forEach(d => {
			if (d.code in differencesInCsv) {
				differencesInCsv[d.code]++;
			}
		});

		line.push(comparedModule);
		line.push(r.template);
		line = line.concat(Object.values(differencesInCsv).map(v => String(v)));

		return line.join(',');
	}
}