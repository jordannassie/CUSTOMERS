import { formatUsd } from "@/modules/billing/format";
import { Section, H2, Lead } from "../section";
import { ExampleTag } from "../home/example";

// A made-up retainer to show the maths; agencies set their own prices.
const EXAMPLE_RETAINER_CENTS = 49900;
const CLIENT_COUNTS = [5, 10, 25, 50];

export function RevenueExample() {
  return (
    <Section id="example-revenue">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-4">
          <H2 className="max-w-[18ch]">Turn AI visibility into a monthly service</H2>
          <Lead>
            Clients are starting to ask whether ChatGPT recommends them. You set your own price for the work. This
            example shows how a monthly retainer adds up.
          </Lead>
        </div>

        <figure className="rounded-md border border-border bg-surface">
          <figcaption className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <span className="text-sm font-semibold">
              If you charge {formatUsd(EXAMPLE_RETAINER_CENTS)} a month per client
            </span>
            <ExampleTag />
          </figcaption>
          <table className="w-full text-[15px]">
            <thead className="sr-only">
              <tr>
                <th scope="col">Clients</th>
                <th scope="col">Revenue a month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CLIENT_COUNTS.map((clients) => (
                <tr key={clients}>
                  <td className="px-5 py-4">{clients} clients</td>
                  <td className="tabular px-5 py-4 text-right font-semibold">
                    {formatUsd(clients * EXAMPLE_RETAINER_CENTS)} a month
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-5 py-4 text-[13px] text-muted-foreground">
            Revenue before your costs and your Customers.Direct plans. Not a forecast or a promise of earnings.
          </p>
        </figure>
      </div>
    </Section>
  );
}

