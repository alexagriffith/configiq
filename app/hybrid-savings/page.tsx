"use client";
import { PageSection, Title, TextContent, EmptyState, EmptyStateBody } from "@patternfly/react-core";
import { CubesIcon } from "@patternfly/react-icons";
import ComingSoonRibbon from "@/components/ComingSoonRibbon/ComingSoonRibbon";

export default function HybridSavingsPage() {
  return (
    <ComingSoonRibbon>
      <PageSection variant="light">
        <TextContent>
          <Title headingLevel="h1" size="2xl">Hybrid Savings</Title>
        </TextContent>
      </PageSection>
      <PageSection>
        <EmptyState>
          <CubesIcon />
          <Title headingLevel="h2" size="lg">Coming soon</Title>
          <EmptyStateBody>
            This tool is coming soon.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    </ComingSoonRibbon>
  );
}
