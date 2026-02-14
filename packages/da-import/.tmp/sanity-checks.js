const fs = require('fs');
const path = require('path');

const chars = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'parsed-characters.json'), 'utf8'));
const speciesTraits = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'species-traits.json'), 'utf8'));
const variantSettings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'variant-settings.json'), 'utf8'));

// Build lookup of valid trait IDs and enum value IDs
const validTraitIds = new Set(speciesTraits.map(t => t.id));
const validEnumValues = new Map(); // enumValueId -> traitId
const enumValueNames = new Map(); // enumValueId -> name
const traitNames = new Map(); // traitId -> name
for (const trait of speciesTraits) {
  traitNames.set(trait.id, trait.name);
  for (const ev of (trait.enumValues || [])) {
    validEnumValues.set(ev.id, trait.id);
    enumValueNames.set(ev.id, ev.name);
  }
}

let issues = 0;

// 1. Check for invalid trait IDs
console.log('=== Invalid Trait IDs ===');
const badTraitIds = new Set();
for (const c of chars) {
  for (const t of c.mappedTraits) {
    if (t.traitId && !validTraitIds.has(t.traitId)) {
      if (!badTraitIds.has(t.traitId)) {
        console.log(`  Unknown traitId: ${t.traitId} (source: "${t.sourceLine}")`);
        badTraitIds.add(t.traitId);
        issues++;
      }
    }
  }
}
if (badTraitIds.size === 0) console.log('  None found.');
console.log('');

// 2. Check for invalid enum value IDs
console.log('=== Invalid Enum Value IDs ===');
const badEnumIds = new Set();
for (const c of chars) {
  for (const t of c.mappedTraits) {
    if (t.enumValueId && !validEnumValues.has(t.enumValueId)) {
      if (!badEnumIds.has(t.enumValueId)) {
        console.log(`  Unknown enumValueId: ${t.enumValueId} (source: "${t.sourceLine}")`);
        badEnumIds.add(t.enumValueId);
        issues++;
      }
    }
  }
}
if (badEnumIds.size === 0) console.log('  None found.');
console.log('');

// 3. Check for enum value ID mapped to wrong trait
console.log('=== Enum Value / Trait ID Mismatches ===');
const mismatchPairs = new Set();
for (const c of chars) {
  for (const t of c.mappedTraits) {
    if (t.enumValueId && t.traitId && validEnumValues.has(t.enumValueId)) {
      const correctTraitId = validEnumValues.get(t.enumValueId);
      if (correctTraitId !== t.traitId) {
        const key = `${t.traitId}:${t.enumValueId}`;
        if (!mismatchPairs.has(key)) {
          console.log(`  Enum "${enumValueNames.get(t.enumValueId)}" (${t.enumValueId}) belongs to trait "${traitNames.get(correctTraitId)}" but mapped to "${traitNames.get(t.traitId) || t.traitId}"`);
          console.log(`    Source: "${t.sourceLine}"`);
          mismatchPairs.add(key);
          issues++;
        }
      }
    }
  }
}
if (mismatchPairs.size === 0) console.log('  None found.');
console.log('');

// 4. Check for duplicate enum values on same trait for same character
console.log('=== Duplicate Enum Values Per Character ===');
let dupCount = 0;
for (const c of chars) {
  const seen = new Map(); // key: traitId+enumValueId -> sourceLine
  for (const t of c.mappedTraits) {
    if (t.enumValueId) {
      const key = `${t.traitId}:${t.enumValueId}`;
      if (seen.has(key)) {
        if (dupCount < 20) {
          console.log(`  ${c.name} (${c.url}):`);
          console.log(`    Duplicate: "${enumValueNames.get(t.enumValueId)}" on "${traitNames.get(t.traitId)}"`);
          console.log(`    Lines: "${seen.get(key)}" and "${t.sourceLine}"`);
        }
        dupCount++;
      } else {
        seen.set(key, t.sourceLine);
      }
    }
  }
}
if (dupCount === 0) console.log('  None found.');
else if (dupCount > 20) console.log(`  ...and ${dupCount - 20} more`);
console.log(`  Total: ${dupCount}`);
console.log('');

// 5. Check for missing owner
console.log('=== Missing Owner ===');
let noOwner = 0;
for (const c of chars) {
  if (!c.ownerDaUsername) {
    if (noOwner < 20) {
      console.log(`  ${c.name || c.numericId} (${c.url})`);
    }
    noOwner++;
    issues++;
  }
}
if (noOwner === 0) console.log('  None found.');
else if (noOwner > 20) console.log(`  ...and ${noOwner - 20} more`);
console.log(`  Total: ${noOwner}`);
console.log('');

// 6. Check for missing DA masterlist link
console.log('=== Missing DA Masterlist Entry ===');
let noLink = 0;
for (const c of chars) {
  const hasLink = c.mappedTraits.some(t => t.textValue && t.textValue.includes('deviantart.com'));
  if (!hasLink) {
    if (noLink < 20) {
      console.log(`  ${c.name || c.numericId} (${c.url})`);
    }
    noLink++;
    issues++;
  }
}
if (noLink === 0) console.log('  None found.');
else if (noLink > 20) console.log(`  ...and ${noLink - 20} more`);
console.log(`  Total: ${noLink}`);
console.log('');

// 7. Check for characters with 0 traits
console.log('=== Characters With No Traits ===');
let noTraits = 0;
for (const c of chars) {
  if (c.mappedTraits.length === 0) {
    if (noTraits < 20) {
      console.log(`  ${c.name || c.numericId} (${c.url})`);
    }
    noTraits++;
    issues++;
  }
}
if (noTraits === 0) console.log('  None found.');
else if (noTraits > 20) console.log(`  ...and ${noTraits - 20} more`);
console.log(`  Total: ${noTraits}`);
console.log('');

// 8. Check for missing derived variant
console.log('=== Missing Derived Variant ===');
let noVariant = 0;
for (const c of chars) {
  if (!c.derivedVariantId) {
    if (noVariant < 20) {
      console.log(`  ${c.name || c.numericId} (${c.url})`);
    }
    noVariant++;
    issues++;
  }
}
if (noVariant === 0) console.log('  None found.');
else if (noVariant > 20) console.log(`  ...and ${noVariant - 20} more`);
console.log(`  Total: ${noVariant}`);
console.log('');

// 9. Check expected trait coverage (eyes, ears, mouths, tails, paws)
console.log('=== Missing Core Traits ===');
const coreTrait = {
  'Eyes': '6db74b21-76ca-4ca5-a229-33bf5df8dbe4',
  'Ears': '21698dc5-3665-4ea6-a014-87758c1c67af',
  'Mouths': 'ba721454-21c3-41d4-9cc3-01d60fa4d618',
  'Tails': '8bd03ff5-3d19-4c39-8b24-67ec4634c107',
  'Paws': '508da275-4435-4385-832e-1cec41e89644',
};
let missingCore = 0;
const missingCoreCounts = {};
for (const [name, id] of Object.entries(coreTrait)) {
  missingCoreCounts[name] = 0;
}
for (const c of chars) {
  const traitIds = new Set(c.mappedTraits.map(t => t.traitId));
  const missing = [];
  for (const [name, id] of Object.entries(coreTrait)) {
    if (!traitIds.has(id)) {
      missing.push(name);
      missingCoreCounts[name]++;
    }
  }
  if (missing.length > 0) {
    if (missingCore < 20) {
      console.log(`  ${c.name || c.numericId} (${c.url}): missing ${missing.join(', ')}`);
    }
    missingCore++;
  }
}
if (missingCore === 0) console.log('  None found.');
else {
  if (missingCore > 20) console.log(`  ...and ${missingCore - 20} more`);
  console.log(`  Total characters missing core traits: ${missingCore}`);
  for (const [name, count] of Object.entries(missingCoreCounts)) {
    if (count > 0) console.log(`    Missing ${name}: ${count}`);
  }
}
console.log('');

// 10. Check for duplicate numeric IDs
console.log('=== Duplicate Numeric IDs ===');
const idCounts = new Map();
for (const c of chars) {
  idCounts.set(c.numericId, (idCounts.get(c.numericId) || 0) + 1);
}
let dupIds = 0;
for (const [id, count] of idCounts) {
  if (count > 1) {
    if (dupIds < 20) {
      console.log(`  numericId ${id} appears ${count} times`);
    }
    dupIds++;
    issues++;
  }
}
if (dupIds === 0) console.log('  None found.');
else if (dupIds > 20) console.log(`  ...and ${dupIds - 20} more`);
console.log(`  Total: ${dupIds}`);
console.log('');

// 11. Outlier trait counts
console.log('=== Outlier Trait Counts ===');
const counts = chars.map(c => c.mappedTraits.length).sort((a, b) => a - b);
const median = counts[Math.floor(counts.length / 2)];
const min = counts[0];
const max = counts[counts.length - 1];
console.log(`  Min: ${min}, Median: ${median}, Max: ${max}`);
let tooFew = 0;
let tooMany = 0;
for (const c of chars) {
  const n = c.mappedTraits.length;
  if (n < 5) {
    if (tooFew < 10) {
      console.log(`  LOW (${n}): ${c.name || c.numericId} (${c.url})`);
    }
    tooFew++;
  } else if (n > 25) {
    if (tooMany < 10) {
      console.log(`  HIGH (${n}): ${c.name || c.numericId} (${c.url})`);
    }
    tooMany++;
  }
}
if (tooFew > 10) console.log(`  ...and ${tooFew - 10} more with <5 traits`);
if (tooMany > 10) console.log(`  ...and ${tooMany - 10} more with >25 traits`);
console.log(`  Characters with <5 traits: ${tooFew}`);
console.log(`  Characters with >25 traits: ${tooMany}`);
console.log('');

// 12. Check for invalid rarity values
console.log('=== Invalid Rarity Values ===');
const validRarities = new Set(['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Exclusive', 'Special']);
const badRarities = new Map();
for (const c of chars) {
  for (const t of c.mappedTraits) {
    if (t.rarity && !validRarities.has(t.rarity)) {
      badRarities.set(t.rarity, (badRarities.get(t.rarity) || 0) + 1);
    }
  }
}
if (badRarities.size === 0) console.log('  None found.');
else {
  for (const [r, count] of badRarities) {
    console.log(`  "${r}": ${count} occurrences`);
    issues++;
  }
}
console.log('');

// 13. Check for suspicious owner usernames
console.log('=== Suspicious Owner Usernames ===');
let badOwners = 0;
for (const c of chars) {
  const u = c.ownerDaUsername;
  if (!u) continue;
  const suspicious =
    u.startsWith('@') ||
    u.includes('http') ||
    u.includes('/') ||
    u.includes(' ') ||
    u.length < 2 ||
    u.length > 40;
  if (suspicious) {
    if (badOwners < 20) {
      console.log(`  ${c.name || c.numericId}: "${u}" (${c.url})`);
    }
    badOwners++;
    issues++;
  }
}
if (badOwners === 0) console.log('  None found.');
else if (badOwners > 20) console.log(`  ...and ${badOwners - 20} more`);
console.log(`  Total: ${badOwners}`);
console.log('');

// 14. Check that derived rarity matches highest rarity from source lines
console.log('=== Derived Rarity Mismatches ===');
const rarityRank = { 'Common': 0, 'Uncommon': 1, 'Rare': 2, 'Very Rare': 3, 'Legendary': 4, 'Exclusive': 5, 'Special': 6 };
const rarityPrefixes = ['Exclusive', 'Legendary', 'Very Rare', 'Special', 'Rare', 'Uncommon', 'Common'];
function extractRarityFromLine(line) {
  if (!line) return null;
  for (const r of rarityPrefixes) {
    if (new RegExp('^' + r + '\\s', 'i').test(line)) return r;
  }
  return null;
}
let rarityMismatches = 0;
for (const c of chars) {
  // Compute highest rarity from source lines (independent of mapped trait rarity fields)
  let highestFromSource = null;
  let highestSourceRank = -1;
  for (const t of c.mappedTraits) {
    const sourceRarity = extractRarityFromLine(t.sourceLine);
    if (sourceRarity && (rarityRank[sourceRarity] ?? -1) > highestSourceRank) {
      highestSourceRank = rarityRank[sourceRarity] ?? -1;
      highestFromSource = sourceRarity;
    }
  }
  // Compute highest rarity from mapped trait rarity fields
  let highestFromTraits = null;
  let highestTraitRank = -1;
  for (const t of c.mappedTraits) {
    if (t.rarity && (rarityRank[t.rarity] ?? -1) > highestTraitRank) {
      highestTraitRank = rarityRank[t.rarity] ?? -1;
      highestFromTraits = t.rarity;
    }
  }
  if (highestFromSource && highestFromTraits && highestFromSource !== highestFromTraits) {
    if (rarityMismatches < 20) {
      console.log(`  ${c.name || c.numericId} (${c.url}):`);
      console.log(`    Source lines suggest: ${highestFromSource}, mapped traits say: ${highestFromTraits}`);
    }
    rarityMismatches++;
    issues++;
  }
}
if (rarityMismatches === 0) console.log('  None found.');
else if (rarityMismatches > 20) console.log(`  ...and ${rarityMismatches - 20} more`);
console.log(`  Total: ${rarityMismatches}`);
console.log('');

// 15. Check enum values are enabled for the character's derived variant
console.log('=== Enum Values Not Enabled For Variant ===');
const variantLookup = new Map(); // variantId -> { name, allowedSet }
for (const v of variantSettings) {
  variantLookup.set(v.id, { name: v.name, allowed: new Set(v.allowedEnumValueIds) });
}
let variantEnumIssues = 0;
const variantEnumDetails = new Map(); // "variantName|enumValueId" -> count
for (const c of chars) {
  if (!c.derivedVariantId) continue;
  const variant = variantLookup.get(c.derivedVariantId);
  if (!variant) continue;
  for (const t of c.mappedTraits) {
    if (!t.enumValueId) continue;
    if (!variant.allowed.has(t.enumValueId)) {
      const evName = enumValueNames.get(t.enumValueId) || t.enumValueId;
      const tName = traitNames.get(t.traitId) || t.traitId;
      const key = `${variant.name}|${t.enumValueId}`;
      if (!variantEnumDetails.has(key)) {
        variantEnumDetails.set(key, { variantName: variant.name, traitName: tName, enumName: evName, count: 0 });
      }
      variantEnumDetails.get(key).count++;
      variantEnumIssues++;
    }
  }
}
if (variantEnumDetails.size === 0) {
  console.log('  None found.');
} else {
  const sorted = [...variantEnumDetails.values()].sort((a, b) => b.count - a.count);
  for (const d of sorted.slice(0, 30)) {
    console.log(`  [${d.variantName}] ${d.traitName}: "${d.enumName}" (${d.count} chars)`);
  }
  if (sorted.length > 30) console.log(`  ...and ${sorted.length - 30} more unique combos`);
}
console.log(`  Total violations: ${variantEnumIssues} across ${variantEnumDetails.size} unique combos`);
console.log('');

// 16. Summary
console.log(`=== Summary ===`);
console.log(`  Total characters: ${chars.length}`);
console.log(`  Total mapped traits: ${chars.reduce((s, c) => s + c.mappedTraits.length, 0)}`);
console.log(`  Invalid trait IDs: ${badTraitIds.size}`);
console.log(`  Invalid enum value IDs: ${badEnumIds.size}`);
console.log(`  Trait/enum mismatches: ${mismatchPairs.size}`);
console.log(`  Duplicate enum values: ${dupCount}`);
console.log(`  Missing owner: ${noOwner}`);
console.log(`  Missing DA link: ${noLink}`);
console.log(`  No traits: ${noTraits}`);
console.log(`  Missing variant: ${noVariant}`);
console.log(`  Missing core traits: ${missingCore}`);
console.log(`  Duplicate numeric IDs: ${dupIds}`);
console.log(`  Invalid rarities: ${badRarities.size}`);
console.log(`  Suspicious usernames: ${badOwners}`);
console.log(`  Rarity mismatches: ${rarityMismatches}`);
console.log(`  Variant enum violations: ${variantEnumIssues} (${variantEnumDetails.size} unique)`);
console.log(`  Outliers (<5 traits): ${tooFew}`);
console.log(`  Outliers (>25 traits): ${tooMany}`);
console.log(`  Issues: ${issues + dupCount}`);
