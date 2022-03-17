const parser = require('../../lua/luaparse');

class AST {
    constructor(source) {
        this.tokens = parser.parse(source);
    }

    serialize(token, level, parent) {
        if (token == null)
            return '';
            
        let str = '';

        switch (token.type) {
            case 'LocalStatement':
                str += 'local ';
            case 'AssignmentStatement':
                for (let i = 0; i < token.variables.length; i++)
                    str += this.serialize(token.variables[i], level, token) + (i != token.variables.length - 1 ? ', ' : '');

                
                str += token.init.length == 0 ? ';\n' : ` ${token.operator || '='} `;
                for (let i = 0; i < token.init.length; i++)
                    str += this.serialize(token.init[i], level, token) + (i != token.init.length - 1 ? ', ' : ';\n');

                break;
            
            case 'IfStatement':
                for (let clause of token.clauses) {
                    str += this.serialize(clause, level, token);
                }

                str += '\t'.repeat(level) + 'end\n';
                break;

            case 'ElseifClause':
                str += '\t'.repeat(level) + `elseif (${this.serialize(token.condition, level, token)}) then\n`;
                str += this.compile(token.body, level + 1, token);
                break;

            case 'ElseClause':
                str += '\t'.repeat(level) + 'else\n';
                str += this.compile(token.body, level + 1, token);
                break;

            case 'IfClause':
                str += `if (${this.serialize(token.condition, level, token)}) then\n`;
                str += this.compile(token.body, level + 1, token);
                break;
            
            case 'CallStatement':
                str += `${this.serialize(token.expression.base, level, token)}(`;

                if (token.expression.type == 'StringCallExpression') {
                    str += this.serialize(token.expression.argument);
                } else if (token.expression.type == 'TableCallExpression') {
                    str += this.serialize(token.expression.arguments)
                } else {
                    for (let i = 0; i < token.expression.arguments.length; i++) {
                        str += this.serialize(token.expression.arguments[i], level, token) + (i != token.expression.arguments.length - 1 ? ', ' : '');            
                    }
                }

                str += ')\n';

                break;

            case 'StringCallExpression': 
                str += `${this.serialize(token.base, level, token)}(`
                str += this.serialize(token.argument, level, token);
                str += ')';

                break;

            case 'CallExpression':
                if (token.base.type == "FunctionDeclaration" || token.base.type == "StringLiteral") {
                    str += `(${this.serialize(token.base, level, token)})(`;
                } else {
                    str += `${this.serialize(token.base, level, token)}(`
                }
                
                for (let i = 0; i < token.arguments.length; i++)
                    str += this.serialize(token.arguments[i], level, token) + (i != token.arguments.length - 1 ? ', ' : '');
                
                str += ')';

                break;
            case 'FunctionDeclaration': 
                str += `${token.isLocal ? 'local ' : ''}function ${this.serialize(token.identifier)}(`
                
                for (let i = 0; i < token.parameters.length; i++)
                    str += this.serialize(token.parameters[i], level, token) + (i != token.parameters.length - 1 ? ', ' : '');
                str += ')\n';

                str += this.compile(token.body, level + 1, token)
                str += '\t'.repeat(level) + 'end\n';
                
                break;

            case 'TableConstructorExpression':
                str += '{';

                for (let i = 0; i < token.fields.length; i++)
                    str += this.serialize(token.fields[i], level, token) + (i != token.fields.length - 1 ? ', ' : '');
                str += '}'
                break;

            case 'TableValue': 
                str += this.serialize(token.value, level, token);
                break;

            case 'TableKeyString':
                str += `${this.serialize(token.key, level, token)} = ${this.serialize(token.value, level, token)}`
                break;

            case 'TableKey':
                str += `[${this.serialize(token.key, level, token)}] = ${this.serialize(token.value, level, token)}`
                break;

            case 'ForNumericStatement':
                str += `for ${this.serialize(token.variable, level, token)} = ${this.serialize(token.start, level, token)}, ${this.serialize(token.end, level, token)}`;
                if (token.step) 
                    str += `, ${this.serialize(token.step, level, token)}`;
                str += ` do\n`

                str += this.compile(token.body, level + 1, token);
                str += '\t'.repeat(level) + 'end\n';
                
                break;

            case 'ForGenericStatement':
                str += `for `;

                for (let i = 0; i < token.variables.length; i++)
                    str += this.serialize(token.variables[i], level, token) + (i != token.variables.length - 1 ? ', ' : '');
                str += ' in ';

                for (let i = 0; i < token.iterators.length; i++)
                    str += this.serialize(token.iterators[i], level, token) + (i != token.iterators.length - 1 ? ', ' : '');
                str += ' do\n'

                str += this.compile(token.body, level + 1, token);
                str += '\t'.repeat(level) + 'end\n';
                break;

            case 'RepeatStatement':
                str += 'repeat\n'
                str += this.compile(token.body, level + 1, token);
                str += '\t'.repeat(level) + `until (${this.serialize(token.condition, level, token)})\n`;
                break;

            case 'ReturnStatement': 
                str += 'return ';

                for (let i = 0; i < token.arguments.length; i++)
                    str += this.serialize(token.arguments[i], level, token) + (i != token.arguments.length - 1 ? ', ' : '');
                str += ';\n'
                break;
            case 'WhileStatement':
                str += `while (${this.serialize(token.condition, level, token)}) do\n`

                str += this.compile(token.body, level + 1, token);
                str += '\t'.repeat(level) + 'end\n';
                break;

            case 'IndexExpression':
                if (token.base.type == 'TableConstructorExpression') {
                    str += `(${this.serialize(token.base, level, token)})[${this.serialize(token.index, level, token)}]`;
                } else {
                    str += `${this.serialize(token.base, level, token)}[${this.serialize(token.index, level, token)}]`;
                }
                break;
                
            case 'UnaryExpression':
                str += `${token.operator} ${this.serialize(token.argument, level, token)}`;
                break;

            case 'BinaryExpression':
            case 'LogicalExpression':
                str += `(${this.serialize(token.left, level, token)} ${token.operator} ${this.serialize(token.right, level, token)})`;
                break;

            case 'MemberExpression':
                str += `${this.serialize(token.base, level, token)}${token.indexer}${this.serialize(token.identifier, level, token)}`;
                break;

            case 'DoStatement':
                str += 'do\n'
                str += this.compile(token.body, level + 1, token);
                str += '\t'.repeat(level) + 'end\n';
                break;

            case 'Identifier':
                str += token.name;
                break;

            case 'BreakStatement':
                str += 'break\n';
                break;

            case 'VarargLiteral':
            case 'BooleanLiteral':
            case 'NumericLiteral':
            case 'NilLiteral':
                str += token.raw;
                break;

            case 'StringLiteral':
                str += `(${token.raw})`;
        }

        return str;
    }

    compile(node, level, parent) {
        node = node || this.tokens.body;
        level = level || 0;

        let str = '';
        for (let token of node) {
            str += ('\t').repeat(level) + this.serialize(token, level, parent);
        }

        return str;
    }
}

module.exports = AST;