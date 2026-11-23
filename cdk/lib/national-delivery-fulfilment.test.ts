import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { NationalDeliveryFulfilment } from './national-delivery-fulfilment';

describe('The NationalDeliveryFulfilment stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new NationalDeliveryFulfilment(
			app,
			'NationalDeliveryFulfilment-CODE',
			{ stack: 'membership', stage: 'CODE' },
		);
		const prodStack = new NationalDeliveryFulfilment(
			app,
			'NationalDeliveryFulfilment-PROD',
			{ stack: 'membership', stage: 'PROD' },
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});

	it('uses the shared Salesforce connected app credentials in CODE', () => {
		const app = new App();
		const codeStack = new NationalDeliveryFulfilment(
			app,
			'NationalDeliveryFulfilment-CODE',
			{ stack: 'membership', stage: 'CODE' },
		);
		const template = Template.fromStack(codeStack);

		template.hasResourceProperties('AWS::Lambda::Function', {
			Environment: {
				Variables: {
					SECRET_NAME_CONNECTED_APP:
						'CODE/Salesforce/ConnectedApp/PrintFulfilment',
				},
			},
		});
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: Match.arrayWith([
					Match.objectLike({
						Action: 'secretsmanager:GetSecretValue',
						Effect: 'Allow',
					}),
				]),
			},
		});
	});
});
