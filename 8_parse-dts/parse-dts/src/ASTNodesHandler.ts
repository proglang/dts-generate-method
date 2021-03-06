import * as ts from 'typescript';
import { DeclaredNamespace } from './DeclaredNamespace';
import { AddFunction } from './AddFunction';
import { DeclaredFunction } from './DeclaredFunction';
import { DeclaredInterface } from './DeclaredInterface';
import { AddInterface } from './AddInterface'

import { DeclaredProperty, DeclaredPropertyType } from './DeclaredProperty';
import { DeclaredPropertyTypePrimitiveKeyword } from './declared-property-types/DeclaredPropertyTypePrimitiveKeyword';
import { DeclaredPropertyTypeFunctionType } from './declared-property-types/DeclaredPropertyTypeFunctionType';
import { DeclaredPropertyTypeLiteralType } from './declared-property-types/DeclaredPropertyTypeLiteralType';
import { DeclaredPropertyTypeUnionType } from './declared-property-types/DeclaredPropertyTypeUnionType';
import { DeclaredPropertyTypeLiterals } from './declared-property-types/DeclaredPropertyTypeLiterals';
import { DeclaredPropertyArrayType } from './declared-property-types/DeclaredPropertyArrayType';
import { AddClass } from './AddClass';
import { DeclaredClass } from './DeclaredClass';

interface SimplifiedFunctionDeclaration {
	name?: ts.Identifier | ts.StringLiteral | ts.NumericLiteral | ts.ComputedPropertyName | undefined;
	type?: ts.TypeNode | undefined;
	parameters: ts.NodeArray<ts.ParameterDeclaration>;
	modifiers?: ts.NodeArray<ts.Modifier> | undefined
}

interface SimplifiedInterfaceDeclaration {
	name?: ts.Identifier;
	members: ts.NodeArray<ts.TypeElement>
}

interface SimplifiedPropertyDeclaration {
	name?: ts.PropertyName | ts.BindingName;
	type?: ts.TypeNode | undefined;
	questionToken?: ts.Token<ts.SyntaxKind.QuestionToken> | undefined;
}

export class ASTNodesHandler {
	addNamespace(node: ts.ModuleDeclaration, declarationMap: DeclaredNamespace): DeclaredNamespace {
		let namespaceName: string = node.name.text;

		let declaredNamespace = new DeclaredNamespace(namespaceName);
		declarationMap.addNamespace(declaredNamespace);

		return declaredNamespace;
	}

	addFunctionDeclaration(node: SimplifiedFunctionDeclaration, parentDeclarationObject: AddFunction): DeclaredFunction {
		let declaredFunction = this.getDeclaredFunction(node);

		parentDeclarationObject.addFunction(declaredFunction);

		return declaredFunction;
	}

	addInterfaceDeclaration(node: SimplifiedInterfaceDeclaration, parentDeclarationObject: AddInterface) {
		let declaredInterface = this.getDeclaredInterface(node);

		parentDeclarationObject.addInterface(declaredInterface);

		return declaredInterface;
	}

	addClassDeclaration(node: ts.ClassDeclaration, parentDeclarationObject: AddClass) {
		let declaredClass = this.getDeclaredClass(node);

		parentDeclarationObject.addClass(declaredClass);
	}

	private getDeclaredFunction(node: SimplifiedFunctionDeclaration): DeclaredFunction {
		let functionName = node.name ? node.name.getText() : "";
		let functionReturnType = node.type ? node.type.getText() : "";

		let declaredFunction = new DeclaredFunction(
			functionName,
			functionReturnType
		);

		node.parameters.forEach(p => {
			const parameterNode = p as ts.ParameterDeclaration;
			declaredFunction.addParameter(this.getDeclaredProperty(parameterNode));
		});

		if (node.modifiers) {
			node.modifiers.forEach(m => {
				const modifierNode = m as ts.Modifier;

				declaredFunction.addModifier(m.getText());
			});
		}

		return declaredFunction;
	}

	private getDeclaredInterface(node: SimplifiedInterfaceDeclaration) : DeclaredInterface {
		let declaredInterface = new DeclaredInterface(node.name ? node.name.getText() : "");

		node.members.forEach(m => {
			switch (m.kind) {
				case ts.SyntaxKind.PropertySignature:
					const p = m as ts.PropertySignature;
					declaredInterface.addProperty(this.getDeclaredProperty(p));

					break;

				case ts.SyntaxKind.MethodSignature:
					declaredInterface.addMethod(this.getDeclaredFunction(m as ts.MethodSignature));
					break;

				case ts.SyntaxKind.CallSignature:
					declaredInterface.addCallSignature(this.getDeclaredFunction(m as ts.CallSignatureDeclaration));

				default:
					break;
			}
		});

		return declaredInterface;
	}

	private getDeclaredClass(classDeclaration: ts.ClassDeclaration) : DeclaredClass {
		let declaredClass = new DeclaredClass(classDeclaration.name ? classDeclaration.name.getText() : "");

		classDeclaration.members.forEach(m => {
			switch (m.kind) {
				case ts.SyntaxKind.Constructor:
					let constructor = this.getDeclaredFunction(m as ts.ConstructorDeclaration);
					constructor.name = "constructor";

					declaredClass.addConstructor(constructor);
					break;

				case ts.SyntaxKind.MethodDeclaration:
					declaredClass.addMethod(
						this.getDeclaredFunction(m as ts.MethodDeclaration)
					);
					break;

				case ts.SyntaxKind.PropertyDeclaration:
					declaredClass.addProperty(
						this.getDeclaredProperty(m as ts.PropertyDeclaration)
					);
					break;

				default:
					break;
			}
		});

		return declaredClass;
	}

	private getDeclaredProperty(p: SimplifiedPropertyDeclaration): DeclaredProperty {
		let parameterName = (p.name ? p.name.getText() : "").trim().replace(/'|"/g, '');

		return new DeclaredProperty(
			parameterName,
			this.getDeclaredPropertyType(p.type),
			(p.questionToken !== undefined)
		);
	}

	private getDeclaredPropertyType(type: ts.TypeNode | undefined) : DeclaredPropertyType {
		if (type) {
			switch (type.kind) {
				case ts.SyntaxKind.ParenthesizedType:
					const parenthesizedTypeNode = type as ts.ParenthesizedTypeNode;
					return this.getDeclaredPropertyType(parenthesizedTypeNode.type);
					break;

				case ts.SyntaxKind.FunctionType:
					const functionType = type as ts.FunctionTypeNode;

					return new DeclaredPropertyTypeFunctionType(this.getDeclaredFunction(functionType));
					break;

				case ts.SyntaxKind.TypeLiteral:
					const typeLiteralNode = type as ts.TypeLiteralNode;

					return new DeclaredPropertyTypeLiteralType(
							this.getDeclaredInterface(typeLiteralNode as SimplifiedInterfaceDeclaration)
					);
					break;

				case ts.SyntaxKind.LiteralType:
					const literalTypeNode = type as ts.LiteralTypeNode;

					return new DeclaredPropertyTypeLiterals(literalTypeNode.getText());

				case ts.SyntaxKind.UnionType:
					const unionTypeNode = type as ts.UnionTypeNode;

					let unionDeclaredProperties: DeclaredPropertyType[] = [];
					unionTypeNode.types.forEach(t => {
						unionDeclaredProperties.push(this.getDeclaredPropertyType(t));
					});

					return new DeclaredPropertyTypeUnionType(unionDeclaredProperties);
					break;

				case ts.SyntaxKind.ArrayType:
					const arrayTypeNode = type as ts.ArrayTypeNode;

					return new DeclaredPropertyArrayType(
						this.getDeclaredPropertyType(arrayTypeNode.elementType)
					);
					break;
			}
		}

		let parameterType = type ? type.getText() : "";
		return new DeclaredPropertyTypePrimitiveKeyword(parameterType)
	}
}