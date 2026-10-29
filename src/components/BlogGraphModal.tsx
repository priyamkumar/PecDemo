'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GraphNode, GraphLink } from '@/types';
import { X, Share2, Users, ExternalLink, Plus, Check } from 'lucide-react';

interface BlogGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribeFeed: (url: string, title?: string, siteUrl?: string) => Promise<void>;
  subscribedUrls: Set<string>;
}

interface SimulatedNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function BlogGraphModal({
  isOpen,
  onClose,
  onSubscribeFeed,
  subscribedUrls,
}: BlogGraphModalProps) {
  const [nodes, setNodes] = useState<SimulatedNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<SimulatedNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const animRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      loadGraph();
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen]);

  const loadGraph = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/discover/graph');
      if (res.ok) {
        const data = await res.json();
        // Initialize positions in a circle around center (400, 300)
        const width = 800;
        const height = 500;
        const centerX = width / 2;
        const centerY = height / 2;

        const simNodes: SimulatedNode[] = (data.nodes || []).map((n: GraphNode, i: number) => {
          const angle = (i / (data.nodes.length || 1)) * 2 * Math.PI;
          const radius = 140 + (Math.random() * 80);
          return {
            ...n,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
          };
        });

        setNodes(simNodes);
        setLinks(data.links || []);

        // Run light force simulation
        runSimulation(simNodes, data.links || [], centerX, centerY);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const runSimulation = (
    simNodes: SimulatedNode[],
    simLinks: GraphLink[],
    cx: number,
    cy: number
  ) => {
    let iterations = 0;
    const maxIterations = 80;

    const step = () => {
      if (iterations++ > maxIterations) return;

      // 1. Repulsion between nodes
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const dx = simNodes[j].x - simNodes[i].x;
          const dy = simNodes[j].y - simNodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 220) {
            const force = (220 - dist) / dist * 0.4;
            simNodes[i].x -= dx * force;
            simNodes[i].y -= dy * force;
            simNodes[j].x += dx * force;
            simNodes[j].y += dy * force;
          }
        }
      }

      // 2. Attraction along links
      const nodeMap = new Map(simNodes.map(n => [n.id, n]));
      for (const link of simLinks) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 120;
          const force = (dist - targetDist) * 0.03 * Math.min(link.weight, 3);
          source.x += (dx / dist) * force;
          source.y += (dy / dist) * force;
          target.x -= (dx / dist) * force;
          target.y -= (dy / dist) * force;
        }
      }

      // 3. Weak pull to center
      for (const node of simNodes) {
        node.x += (cx - node.x) * 0.02;
        node.y += (cy - node.y) * 0.02;
        // bounds
        node.x = Math.max(50, Math.min(750, node.x));
        node.y = Math.max(50, Math.min(450, node.y));
      }

      setNodes([...simNodes]);
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
  };

  if (!isOpen) return null;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                Independent Blog Co-Subscription Graph
              </h2>
              <p className="text-[11px] text-zinc-400">
                Interactive network clusters: edges connect blogs frequently followed together by independent readers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Graph Canvas / SVG */}
        <div className="flex-1 relative bg-gradient-to-b from-zinc-950 to-zinc-900 overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="text-zinc-500 text-xs flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span>Simulating network physics...</span>
            </div>
          ) : (
            <svg
              viewBox="0 0 800 500"
              className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            >
              <defs>
                <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Links */}
              {links.map((link, idx) => {
                const s = nodeMap.get(link.source);
                const t = nodeMap.get(link.target);
                if (!s || !t) return null;

                const isConnectedToSelected =
                  selectedNode && (selectedNode.id === s.id || selectedNode.id === t.id);

                return (
                  <line
                    key={idx}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={isConnectedToSelected ? '#06b6d4' : '#3f3f46'}
                    strokeWidth={isConnectedToSelected ? Math.min(link.weight * 1.5, 4) : Math.min(link.weight, 2)}
                    strokeOpacity={isConnectedToSelected ? 0.9 : 0.4}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                const r = Math.max(14, Math.min(26, node.val));

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                  >
                    <circle
                      r={r}
                      fill={isSelected ? '#06b6d4' : '#18181b'}
                      stroke={isSelected ? '#a5f3fc' : '#f59e0b'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all duration-150 hover:stroke-cyan-400 hover:scale-110"
                    />
                    <text
                      dy="4"
                      textAnchor="middle"
                      fill={isSelected ? '#082f49' : '#f4f4f5'}
                      fontSize={r > 18 ? '10' : '9'}
                      fontWeight="bold"
                      className="pointer-events-none select-none font-sans"
                    >
                      {node.name.slice(0, 3).toUpperCase()}
                    </text>
                    <text
                      y={r + 12}
                      textAnchor="middle"
                      fill="#a1a1aa"
                      fontSize="9"
                      className="pointer-events-none select-none drop-shadow"
                    >
                      {node.name.length > 18 ? node.name.slice(0, 16) + '…' : node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Node Inspector Overlay */}
          {selectedNode && (
            <div className="absolute bottom-4 right-4 bg-zinc-900/90 border border-zinc-700 backdrop-blur-md p-4 rounded-xl max-w-sm shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-zinc-100">{selectedNode.name}</h4>
                  <a
                    href={selectedNode.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>Visit blog</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Network popularity: {selectedNode.val} readers
                </span>

                <button
                  onClick={() => {
                    // Try subscribing
                    onSubscribeFeed(selectedNode.siteUrl, selectedNode.name, selectedNode.siteUrl);
                  }}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Subscribe</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
