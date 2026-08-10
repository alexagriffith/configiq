"use client";
import {
  PageSection,
  Title,
  Text,
  TextContent,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardTitle,
  Button,
} from "@patternfly/react-core";
import {
  MigrationIcon,
  ChartBarIcon,
  SlidersHIcon,
  BoltIcon,
  CalculatorIcon,
  MicrochipIcon,
  SearchIcon,
  CoinsIcon,
  ServerGroupIcon,
  RouteIcon,
} from "@patternfly/react-icons";
import Link from "next/link";

const tools = [
  {
    title: "Performance estimate",
    description:
      "Estimate TTFT, TPOT, and throughput for your model and parallelism configuration.",
    href: "/quick-estimate",
    icon: <BoltIcon />,
  },
  {
    title: "Advanced sizing",
    description:
      "Find the optimal GPU configuration for a workload target using the AIConfigurator engine.",
    href: "/calculator",
    icon: <SlidersHIcon />,
  },
  {
    title: "KV cache calculator",
    description:
      "Calculate KV cache memory requirements for any model on supported GPU systems.",
    href: "/kv-cache",
    icon: <CalculatorIcon />,
  },
  {
    title: "GPU Explorer",
    description:
      "Search and compare GPUs across memory, throughput, cost, and availability.",
    href: "/gpu-explorer",
    icon: <SearchIcon />,
  },
  {
    title: "Hybrid savings",
    description:
      "Model cost savings between cloud, on-premise, and hybrid GPU deployment strategies.",
    href: "/hybrid-savings",
    icon: <CoinsIcon />,
  },
  {
    title: "Cluster cost",
    description:
      "Estimate total cost of ownership for multi-GPU inference clusters.",
    href: "/cluster-cost",
    icon: <ServerGroupIcon />,
  },
  {
    title: "Routing economics",
    description:
      "Analyze request routing between model tiers to optimize cost vs quality tradeoffs.",
    href: "/routing",
    icon: <RouteIcon />,
  },
];

export default function HomePage() {
  return (
    <>
      <PageSection variant="light">
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '0.875rem', color: '#6A6E73' }}>
            Work in progress
          </div>
          <TextContent>
            <Title headingLevel="h1" size="2xl">
              ConfigIQ
            </Title>
            <Text component="p">
              LLM inference sizing, GPU comparison, and cost modeling for
              engineers and infrastructure teams.
            </Text>
          </TextContent>
        </div>
      </PageSection>

      <PageSection>
        <Grid hasGutter sm={12} md={6} lg={4}>
          {tools.map((tool) => (
            <GridItem key={tool.href}>
              <Card isFullHeight>
                <CardTitle>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {tool.icon}
                    {tool.title}
                  </span>
                </CardTitle>
                <CardBody>
                  <Text component="p" style={{ marginBottom: 16 }}>
                    {tool.description}
                  </Text>
                  <Button
                    variant="link"
                    isInline
                    component={(props) => <Link href={tool.href} {...props} />}
                  >
                    Open tool →
                  </Button>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </PageSection>
    </>
  );
}
