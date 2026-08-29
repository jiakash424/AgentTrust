import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create or get workspace
  let workspace = await prisma.workspace.findFirst({
    where: { name: 'Development Workspace' }
  });
  
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'Development Workspace' }
    });
    console.log('Created Development Workspace');
  }

  // Create or get product
  let product = await prisma.product.findFirst({
    where: { workspaceId: workspace.id, name: 'Stainless Steel Water Bottle' }
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        workspaceId: workspace.id,
        name: 'Stainless Steel Water Bottle',
        category: 'Drinkware',
        basePrice: 300,
        description: 'High quality 1L stainless steel water bottle suitable for bulk orders and corporate gifting.',
      }
    });
    console.log('Created Product: Stainless Steel Water Bottle');
  }

  // Create or get inventory
  let inventory = await prisma.inventoryItem.findFirst({
    where: { workspaceId: workspace.id, productId: product.id }
  });

  if (!inventory) {
    inventory = await prisma.inventoryItem.create({
      data: {
        workspaceId: workspace.id,
        productId: product.id,
        quantity: 5000,
      }
    });
    console.log('Created Inventory: 5000 units');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
